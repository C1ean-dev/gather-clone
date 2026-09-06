// Windows WASAPI process-loopback helper for the desktop client.
// stdout is raw PCM only: signed 16-bit little-endian, stereo, 48 kHz.

#include <windows.h>
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <mmdeviceapi.h>
#include <propvarutil.h>

#include <atomic>
#include <cwchar>
#include <iostream>
#include <new>

namespace {

constexpr WORD kChannels = 2;
constexpr DWORD kSampleRate = 48000;
constexpr WORD kBitsPerSample = 16;

class ActivationHandler final : public IActivateAudioInterfaceCompletionHandler {
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
    if (iid == IID_IUnknown || iid == __uuidof(IActivateAudioInterfaceCompletionHandler)) {
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

}  // namespace

int wmain(int argc, wchar_t* argv[]) {
  if (argc != 3 || wcscmp(argv[1], L"--source-id") != 0) {
    std::wcerr << L"Usage: process-audio-capture --source-id window:<HWND>:<index>\n";
    return 2;
  }

  HWND targetWindow = nullptr;
  if (!ParseWindowHandle(argv[2], &targetWindow)) {
    std::wcerr << L"[process-audio-capture] The selected source is not a valid application window.\n";
    return 3;
  }

  DWORD processId = 0;
  if (GetWindowThreadProcessId(targetWindow, &processId) == 0 || processId == 0) {
    std::wcerr << L"[process-audio-capture] Could not resolve the selected window process.\n";
    return 4;
  }

  const HRESULT com = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  if (FAILED(com) && com != RPC_E_CHANGED_MODE) {
    PrintError(L"COM initialization failed", com);
    return 5;
  }

  IAudioClient* audioClient = nullptr;
  HRESULT hr = ActivateProcessLoopback(processId, &audioClient);
  if (FAILED(hr)) {
    PrintError(L"Process-loopback activation failed", hr);
    if (SUCCEEDED(com)) CoUninitialize();
    return 6;
  }

  WAVEFORMATEX format = {};
  format.wFormatTag = WAVE_FORMAT_PCM;
  format.nChannels = kChannels;
  format.nSamplesPerSec = kSampleRate;
  format.wBitsPerSample = kBitsPerSample;
  format.nBlockAlign = format.nChannels * format.wBitsPerSample / 8;
  format.nAvgBytesPerSec = format.nSamplesPerSec * format.nBlockAlign;

  HANDLE sampleEvent = CreateEventW(nullptr, FALSE, FALSE, nullptr);
  if (!sampleEvent) {
    PrintError(L"Could not create capture event", HRESULT_FROM_WIN32(GetLastError()));
    audioClient->Release();
    if (SUCCEEDED(com)) CoUninitialize();
    return 7;
  }

  hr = audioClient->Initialize(
      AUDCLNT_SHAREMODE_SHARED,
      AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
      0, 0, &format, nullptr);
  if (SUCCEEDED(hr)) hr = audioClient->SetEventHandle(sampleEvent);

  IAudioCaptureClient* captureClient = nullptr;
  if (SUCCEEDED(hr)) hr = audioClient->GetService(IID_PPV_ARGS(&captureClient));
  if (SUCCEEDED(hr)) hr = audioClient->Start();
  if (FAILED(hr)) {
    PrintError(L"Could not start process-loopback capture", hr);
    if (captureClient) captureClient->Release();
    CloseHandle(sampleEvent);
    audioClient->Release();
    if (SUCCEEDED(com)) CoUninitialize();
    return 8;
  }

  // stdout must remain PCM-only; Electron uses this readiness signal on
  // stderr before it marks the isolated source audio as available.
  std::wcerr << L"[process-audio-capture] READY\n";
  std::wcerr.flush();

  HANDLE output = GetStdHandle(STD_OUTPUT_HANDLE);
  bool keepCapturing = output && output != INVALID_HANDLE_VALUE;
  while (keepCapturing) {
    const DWORD wait = WaitForSingleObject(sampleEvent, 1000);
    if (wait != WAIT_OBJECT_0 && wait != WAIT_TIMEOUT) break;

    UINT32 nextPacketFrames = 0;
    while (keepCapturing && SUCCEEDED(captureClient->GetNextPacketSize(&nextPacketFrames)) && nextPacketFrames > 0) {
      BYTE* data = nullptr;
      UINT32 frames = 0;
      DWORD flags = 0;
      hr = captureClient->GetBuffer(&data, &frames, &flags, nullptr, nullptr);
      if (FAILED(hr)) {
        PrintError(L"Could not read process audio", hr);
        keepCapturing = false;
        break;
      }

      const DWORD bytes = frames * format.nBlockAlign;
      keepCapturing = (flags & AUDCLNT_BUFFERFLAGS_SILENT) ? WriteSilence(output, bytes) : WriteAll(output, data, bytes);
      captureClient->ReleaseBuffer(frames);
    }
  }

  audioClient->Stop();
  captureClient->Release();
  CloseHandle(sampleEvent);
  audioClient->Release();
  if (SUCCEEDED(com)) CoUninitialize();
  return 0;
}
