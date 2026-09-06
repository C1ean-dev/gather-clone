// Windows WASAPI process-loopback helper for the desktop client.
// Supports both single-window capture and dynamic whole-screen monitor capture.
// stdout is raw PCM only: signed 16-bit little-endian, stereo, 48 kHz.

#include <windows.h>
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <mmdeviceapi.h>
#include <propvarutil.h>
#include <roapi.h>
#include <dwmapi.h>

#include <atomic>
#include <chrono>
#include <cwchar>
#include <iostream>
#include <map>
#include <memory>
#include <new>
#include <set>
#include <string>
#include <vector>

namespace {

constexpr WORD kChannels = 2;
constexpr DWORD kSampleRate = 48000;
constexpr WORD kBitsPerSample = 16;
constexpr DWORD kBytesPerFrame = kChannels * (kBitsPerSample / 8); // 4 bytes

class ActivationHandler final : public IActivateAudioInterfaceCompletionHandler, public IAgileObject {
 public:
  ActivationHandler() : completed_(CreateEventW(nullptr, TRUE, FALSE, nullptr)) {}
  ~ActivationHandler() {
    if (client_) client_->Release();
    if (completed_) CloseHandle(completed_);
  }

  HRESULT WaitForClient(IAudioClient** client) {
    if (!completed_) return HRESULT_FROM_WIN32(GetLastError());
    const DWORD wait = WaitForSingleObject(completed_, 5000);
    if (wait != WAIT_OBJECT_0) return HRESULT_FROM_WIN32(wait == WAIT_TIMEOUT ? ERROR_TIMEOUT : GetLastError());
    if (FAILED(result_)) return result_;
    if (!client_) return E_NOINTERFACE;
    client_->AddRef();
    *client = client_;
    return S_OK;
  }

  STDMETHODIMP QueryInterface(REFIID iid, void** object) override {
    if (!object) return E_POINTER;
    if (iid == IID_IUnknown || iid == __uuidof(IActivateAudioInterfaceCompletionHandler) || iid == __uuidof(IAgileObject)) {
      *object = static_cast<IActivateAudioInterfaceCompletionHandler*>(this);
      AddRef();
      return S_OK;
    }
    *object = nullptr;
    return E_NOINTERFACE;
  }

  STDMETHODIMP_(ULONG) AddRef() override { return ++references_; }
  STDMETHODIMP_(ULONG) Release() override {
    const ULONG references = --references_;
    if (references == 0) delete this;
    return references;
  }

  STDMETHODIMP ActivateCompleted(IActivateAudioInterfaceAsyncOperation* operation) override {
    IUnknown* unknown = nullptr;
    HRESULT activationResult = E_FAIL;
    result_ = operation->GetActivateResult(&activationResult, &unknown);
    if (SUCCEEDED(result_)) result_ = activationResult;
    if (SUCCEEDED(result_) && unknown) result_ = unknown->QueryInterface(IID_PPV_ARGS(&client_));
    if (unknown) unknown->Release();
    SetEvent(completed_);
    return S_OK;
  }

 private:
  std::atomic<ULONG> references_{1};
  HANDLE completed_ = nullptr;
  HRESULT result_ = E_UNEXPECTED;
  IAudioClient* client_ = nullptr;
};

bool ParseWindowHandle(const wchar_t* sourceId, HWND* window) {
  constexpr wchar_t prefix[] = L"window:";
  if (!sourceId || wcsncmp(sourceId, prefix, _countof(prefix) - 1) != 0) return false;
  const wchar_t* value = sourceId + _countof(prefix) - 1;
  wchar_t* end = nullptr;
  const unsigned long long handleValue = wcstoull(value, &end, 10);
  if (end == value || !end || *end != L':') return false;
  *window = reinterpret_cast<HWND>(static_cast<uintptr_t>(handleValue));
  return IsWindow(*window) != FALSE;
}

HRESULT ActivateProcessLoopback(DWORD processId, IAudioClient** audioClient) {
  AUDIOCLIENT_ACTIVATION_PARAMS parameters = {};
  parameters.ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;
  parameters.ProcessLoopbackParams.TargetProcessId = processId;
  parameters.ProcessLoopbackParams.ProcessLoopbackMode = PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE;

  PROPVARIANT activation = {};
  activation.vt = VT_BLOB;
  activation.blob.cbSize = sizeof(parameters);
  activation.blob.pBlobData = reinterpret_cast<BYTE*>(&parameters);

  auto* handler = new (std::nothrow) ActivationHandler();
  if (!handler) return E_OUTOFMEMORY;
  IActivateAudioInterfaceAsyncOperation* operation = nullptr;
  HRESULT hr = ActivateAudioInterfaceAsync(
      VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK, __uuidof(IAudioClient), &activation, handler, &operation);
  if (SUCCEEDED(hr)) hr = handler->WaitForClient(audioClient);
  if (operation) operation->Release();
  handler->Release();
  return hr;
}

bool WriteAll(HANDLE output, const BYTE* data, DWORD size) {
  while (size > 0) {
    DWORD written = 0;
    if (!WriteFile(output, data, size, &written, nullptr) || written == 0) return false;
    data += written;
    size -= written;
  }
  return true;
}

bool WriteSilence(HANDLE output, DWORD bytes) {
  constexpr DWORD kChunk = 4096;
  BYTE zeros[kChunk] = {};
  while (bytes > 0) {
    const DWORD count = bytes > kChunk ? kChunk : bytes;
    if (!WriteAll(output, zeros, count)) return false;
    bytes -= count;
  }
  return true;
}

void PrintError(const wchar_t* message, HRESULT hr) {
  std::wcerr << L"[process-audio-capture] " << message << L" (0x" << std::hex << hr << L")\n";
}

struct ProcessSession {
  DWORD pid{0};
  IAudioClient* audioClient{nullptr};
  IAudioCaptureClient* captureClient{nullptr};
  HANDLE sampleEvent{nullptr};
  std::vector<int16_t> buffer;

  void Dispose() {
    if (audioClient) {
      audioClient->Stop();
    }
    if (captureClient) {
      captureClient->Release();
      captureClient = nullptr;
    }
    if (sampleEvent) {
      CloseHandle(sampleEvent);
      sampleEvent = nullptr;
    }
    if (audioClient) {
      audioClient->Release();
      audioClient = nullptr;
    }
    buffer.clear();
  }
};

std::unique_ptr<ProcessSession> CreateProcessSession(DWORD pid, const WAVEFORMATEX& format) {
  IAudioClient* client = nullptr;
  HRESULT hr = ActivateProcessLoopback(pid, &client);
  if (FAILED(hr) || !client) return nullptr;

  HANDLE sampleEvent = CreateEventW(nullptr, FALSE, FALSE, nullptr);
  if (!sampleEvent) {
    client->Release();
    return nullptr;
  }

  hr = client->Initialize(
      AUDCLNT_SHAREMODE_SHARED,
      AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
      0, 0, &format, nullptr);
  if (FAILED(hr)) {
    CloseHandle(sampleEvent);
    client->Release();
    return nullptr;
  }

  hr = client->SetEventHandle(sampleEvent);
  if (FAILED(hr)) {
    CloseHandle(sampleEvent);
    client->Release();
    return nullptr;
  }

  IAudioCaptureClient* capture = nullptr;
  hr = client->GetService(IID_PPV_ARGS(&capture));
  if (FAILED(hr) || !capture) {
    CloseHandle(sampleEvent);
    client->Release();
    return nullptr;
  }

  hr = client->Start();
  if (FAILED(hr)) {
    capture->Release();
    CloseHandle(sampleEvent);
    client->Release();
    return nullptr;
  }

  auto session = std::make_unique<ProcessSession>();
  session->pid = pid;
  session->audioClient = client;
  session->captureClient = capture;
  session->sampleEvent = sampleEvent;
  return session;
}

struct WindowScanContext {
  HMONITOR targetMonitor;
  DWORD selfPid;
  std::set<DWORD> pidsOnScreen;
};

BOOL CALLBACK ScanWindowsProc(HWND hwnd, LPARAM lParam) {
  auto* ctx = reinterpret_cast<WindowScanContext*>(lParam);
  if (!IsWindow(hwnd) || !IsWindowVisible(hwnd) || IsIconic(hwnd)) return TRUE;

  int cloaked = 0;
  DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &cloaked, sizeof(cloaked));
  if (cloaked) return TRUE;

  RECT rc = {};
  if (!GetWindowRect(hwnd, &rc) || (rc.right - rc.left <= 20) || (rc.bottom - rc.top <= 20)) return TRUE;

  HMONITOR mon = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
  if (mon == ctx->targetMonitor) {
    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);
    if (pid != 0 && pid != ctx->selfPid) {
      ctx->pidsOnScreen.insert(pid);
    }
  }
  return TRUE;
}

std::set<DWORD> ScanProcessesOnMonitor(HMONITOR targetMonitor, DWORD selfPid) {
  WindowScanContext ctx{targetMonitor, selfPid, {}};
  HDESK desk = OpenInputDesktop(0, FALSE, GENERIC_ALL);
  if (desk) {
    EnumDesktopWindows(desk, ScanWindowsProc, reinterpret_cast<LPARAM>(&ctx));
    CloseDesktop(desk);
  } else {
    EnumWindows(ScanWindowsProc, reinterpret_cast<LPARAM>(&ctx));
  }
  return ctx.pidsOnScreen;
}

int RunWindowCapture(HWND targetWindow) {
  DWORD processId = 0;
  if (GetWindowThreadProcessId(targetWindow, &processId) == 0 || processId == 0) {
    std::wcerr << L"[process-audio-capture] Could not resolve the selected window process.\n";
    return 4;
  }

  WAVEFORMATEX format = {};
  format.wFormatTag = WAVE_FORMAT_PCM;
  format.nChannels = kChannels;
  format.nSamplesPerSec = kSampleRate;
  format.wBitsPerSample = kBitsPerSample;
  format.nBlockAlign = format.nChannels * format.wBitsPerSample / 8;
  format.nAvgBytesPerSec = format.nSamplesPerSec * format.nBlockAlign;

  auto session = CreateProcessSession(processId, format);
  if (!session) {
    std::wcerr << L"[process-audio-capture] Could not initialize loopback for process " << processId << L"\n";
    return 6;
  }

  std::wcerr << L"[process-audio-capture] READY\n";
  std::wcerr.flush();

  HANDLE output = GetStdHandle(STD_OUTPUT_HANDLE);
  bool keepCapturing = output && output != INVALID_HANDLE_VALUE;
  while (keepCapturing) {
    const DWORD wait = WaitForSingleObject(session->sampleEvent, 1000);
    if (wait != WAIT_OBJECT_0 && wait != WAIT_TIMEOUT) break;

    UINT32 nextPacketFrames = 0;
    while (keepCapturing && SUCCEEDED(session->captureClient->GetNextPacketSize(&nextPacketFrames)) && nextPacketFrames > 0) {
      BYTE* data = nullptr;
      UINT32 frames = 0;
      DWORD flags = 0;
      HRESULT hr = session->captureClient->GetBuffer(&data, &frames, &flags, nullptr, nullptr);
      if (FAILED(hr)) {
        PrintError(L"Could not read process audio", hr);
        keepCapturing = false;
        break;
      }

      const DWORD bytes = frames * format.nBlockAlign;
      keepCapturing = (flags & AUDCLNT_BUFFERFLAGS_SILENT) ? WriteSilence(output, bytes) : WriteAll(output, data, bytes);
      session->captureClient->ReleaseBuffer(frames);
    }
  }

  session->Dispose();
  return 0;
}

int RunScreenCapture(int left, int top, int width, int height) {
  POINT centerPt = { left + width / 2, top + height / 2 };
  HMONITOR targetMonitor = MonitorFromPoint(centerPt, MONITOR_DEFAULTTONEAREST);
  if (!targetMonitor) {
    std::wcerr << L"[process-audio-capture] Target monitor could not be resolved from coordinates.\n";
    return 3;
  }

  WAVEFORMATEX format = {};
  format.wFormatTag = WAVE_FORMAT_PCM;
  format.nChannels = kChannels;
  format.nSamplesPerSec = kSampleRate;
  format.wBitsPerSample = kBitsPerSample;
  format.nBlockAlign = format.nChannels * format.wBitsPerSample / 8;
  format.nAvgBytesPerSec = format.nSamplesPerSec * format.nBlockAlign;

  const DWORD selfPid = GetCurrentProcessId();
  std::map<DWORD, std::unique_ptr<ProcessSession>> sessions;

  std::wcerr << L"[process-audio-capture] READY\n";
  std::wcerr.flush();

  HANDLE output = GetStdHandle(STD_OUTPUT_HANDLE);
  bool keepCapturing = output && output != INVALID_HANDLE_VALUE;

  auto lastScanTime = std::chrono::steady_clock::now() - std::chrono::milliseconds(500);

  // Buffer for mixing multiple streams (480 frames = 10ms of audio)
  constexpr UINT32 kMixFrames = 480;
  std::vector<int32_t> mixBufferLeft(kMixFrames, 0);
  std::vector<int32_t> mixBufferRight(kMixFrames, 0);
  std::vector<int16_t> outputPcm(kMixFrames * kChannels, 0);

  while (keepCapturing) {
    auto now = std::chrono::steady_clock::now();
    if (now - lastScanTime >= std::chrono::milliseconds(300)) {
      lastScanTime = now;
      std::set<DWORD> desiredPids = ScanProcessesOnMonitor(targetMonitor, selfPid);

      // Stop and remove sessions whose windows left this monitor
      for (auto it = sessions.begin(); it != sessions.end();) {
        if (desiredPids.find(it->first) == desiredPids.end()) {
          it->second->Dispose();
          it = sessions.erase(it);
        } else {
          ++it;
        }
      }

      // Start sessions for newly arrived processes on this monitor
      for (DWORD pid : desiredPids) {
        if (sessions.find(pid) == sessions.end()) {
          auto session = CreateProcessSession(pid, format);
          if (session) {
            sessions[pid] = std::move(session);
          }
        }
      }
    }

    // Drain packets from all active sessions into their pending sample buffers
    for (auto& pair : sessions) {
      auto& s = pair.second;
      UINT32 nextPacketFrames = 0;
      while (SUCCEEDED(s->captureClient->GetNextPacketSize(&nextPacketFrames)) && nextPacketFrames > 0) {
        BYTE* data = nullptr;
        UINT32 frames = 0;
        DWORD flags = 0;
        HRESULT hr = s->captureClient->GetBuffer(&data, &frames, &flags, nullptr, nullptr);
        if (FAILED(hr)) break;

        const int16_t* pcmIn = reinterpret_cast<const int16_t*>(data);
        const size_t totalSamples = frames * kChannels;
        if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
          s->buffer.insert(s->buffer.end(), totalSamples, 0);
        } else {
          s->buffer.insert(s->buffer.end(), pcmIn, pcmIn + totalSamples);
        }
        s->captureClient->ReleaseBuffer(frames);
      }
    }

    // Determine how many frames we can mix across sessions
    size_t minAvailableFrames = 0;
    if (!sessions.empty()) {
      bool first = true;
      for (const auto& pair : sessions) {
        size_t frames = pair.second->buffer.size() / kChannels;
        if (first || frames < minAvailableFrames) {
          minAvailableFrames = frames;
          first = false;
        }
      }
    }

    // If we have enough frames or if no sessions are active, write audio blocks
    if (sessions.empty()) {
      // Keep WebRTC steady with 10ms silence chunks
      Sleep(10);
      keepCapturing = WriteSilence(output, kMixFrames * kBytesPerFrame);
    } else if (minAvailableFrames >= kMixFrames) {
      // Mix kMixFrames across all sessions
      std::fill(mixBufferLeft.begin(), mixBufferLeft.end(), 0);
      std::fill(mixBufferRight.begin(), mixBufferRight.end(), 0);

      for (auto& pair : sessions) {
        auto& buf = pair.second->buffer;
        for (UINT32 f = 0; f < kMixFrames; ++f) {
          mixBufferLeft[f] += buf[f * 2];
          mixBufferRight[f] += buf[f * 2 + 1];
        }
        buf.erase(buf.begin(), buf.begin() + (kMixFrames * kChannels));
      }

      for (UINT32 f = 0; f < kMixFrames; ++f) {
        int32_t l = mixBufferLeft[f];
        int32_t r = mixBufferRight[f];
        if (l > 32767) l = 32767; else if (l < -32768) l = -32768;
        if (r > 32767) r = 32767; else if (r < -32768) r = -32768;
        outputPcm[f * 2] = static_cast<int16_t>(l);
        outputPcm[f * 2 + 1] = static_cast<int16_t>(r);
      }

      keepCapturing = WriteAll(output, reinterpret_cast<const BYTE*>(outputPcm.data()), kMixFrames * kBytesPerFrame);
    } else {
      // Wait briefly for more audio packets
      Sleep(5);
    }
  }

  for (auto& pair : sessions) {
    pair.second->Dispose();
  }
  sessions.clear();
  return 0;
}

}  // namespace

int wmain(int argc, wchar_t* argv[]) {
  // Supported invocations:
  // 1. Window capture: process-audio-capture --source-id window:<HWND>:<index>
  // 2. Screen capture: process-audio-capture --source-id screen:<id> --screen-bounds <left> <top> <width> <height>
  if (argc < 3 || wcscmp(argv[1], L"--source-id") != 0) {
    std::wcerr << L"Usage: process-audio-capture --source-id <window:...|screen:...> [--screen-bounds left top width height]\n";
    return 2;
  }

  const wchar_t* sourceId = argv[2];
  const bool isScreen = (wcsncmp(sourceId, L"screen:", 7) == 0);

  HRESULT ro = RoInitialize(RO_INIT_MULTITHREADED);
  if (FAILED(ro) && ro != RPC_E_CHANGED_MODE) {
    CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  }

  int exitCode = 0;
  if (isScreen) {
    int left = 0, top = 0, width = 1920, height = 1080;
    for (int i = 3; i < argc; ++i) {
      if (wcscmp(argv[i], L"--screen-bounds") == 0 && i + 4 < argc) {
        left = _wtoi(argv[i + 1]);
        top = _wtoi(argv[i + 2]);
        width = _wtoi(argv[i + 3]);
        height = _wtoi(argv[i + 4]);
        break;
      }
    }
    exitCode = RunScreenCapture(left, top, width, height);
  } else {
    HWND targetWindow = nullptr;
    if (!ParseWindowHandle(sourceId, &targetWindow)) {
      std::wcerr << L"[process-audio-capture] The selected source is not a valid application window.\n";
      RoUninitialize();
      return 3;
    }
    exitCode = RunWindowCapture(targetWindow);
  }

  RoUninitialize();
  return exitCode;
}
