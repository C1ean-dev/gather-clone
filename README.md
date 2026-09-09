# Gather V2 — Espaço Virtual de Colaboração e Chamadas P2P

[![React](https://img.shields.io/badge/React-18.3-20232A?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33.2-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-46_Suites_|_278_Tests-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P_Mesh-333333?style=flat-square)](https://webrtc.org/)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](LICENSE)

Ambiente virtual para coworking, reuniões e interação em tempo real, integrando interface em pixel art 2D a chamadas de voz e vídeo descentralizadas via WebRTC. O sistema conta com processamento avançado de áudio em tempo real (DSP e rede neural), isolamento acústico por zonas, compartilhamento de tela em alta definição e estúdio integrado para criação de elementos gráficos.

---

## Recursos e Funcionalidades

### 1. Sistema de Áudio e Processamento Digital de Sinais (DSP)

- **Três Motores de Processamento Selecionáveis**:
  - **DSP Clássico**: Filtro passa-altas (80 Hz contra impactos na mesa), filtro high-shelf (6.500 Hz) e Noise Gate rápido com corte imediato de silêncio e compressor de pico.
  - **DSP Suave**: Expansor dinâmico descendente com transição suave (histerese ampla e release de 250 ms) que atenua o ruído contínuo preservando respirações, sussurros e consoantes finais.
  - **RNNoise Neural**: Redução de ruído por inteligência artificial executada localmente via WebAssembly e AudioWorklet, isolando os harmônicos da voz humana e eliminando ruídos complexos de fundo.
- **Calibração Automática de Microfone**:
  - Medição acústica do ruído de fundo (noise floor em dBFS) a partir de amostras brutas com cálculo pela mediana da metade inferior, evitando distorções causadas por fala ou ruídos esporádicos.
  - Recomendação automática do motor mais adequado e do limiar numérico do Noise Gate.
- **Visualizador de Formas de Onda (Waveform)**:
  - Renderização vetorial SVG de alta resolução (64 a 75 barras simétricas) com gradiente contínuo e oscilação orgânica, reagindo em tempo real ao espectro vocal e aos picos de pressão sonora.
- **Comparação A/B/C Sincronizada**:
  - Exibição paralela das três faixas tratadas (DSP Clássico, DSP Suave e RNNoise) no mesmo espaço da interface.
  - Sincronização automática do indicador de tempo de reprodução entre as trilhas, permitindo alternar entre os motores instantaneamente na mesma sílaba.
- **Isolamento de Áudio de Compartilhamento de Tela & Ducking Inteligente**:
  - Módulo nativo em C++ (WASAPI Loopback) para captura direta de áudio de janelas e processos de software.
  - Isolamento acústico automático das vozes dos participantes da conferência, impedindo realimentação (eco de retorno).
  - Atenuação automática (ducking) do áudio da tela durante a fala do transmissor.

### 2. Espaços Virtuais e Zonas Acústicas Privadas

- **Isolamento por Zonas**: Conexão automática de áudio e vídeo restrita aos participantes posicionados dentro do perímetro da mesma sala ou mesa demarcada.
- **Sistema de Controle de Acesso e Trancamento**:
  - Fechamento de portas com controle de acesso para ocupantes autorizados.
  - Sinalização de batida na porta (door knocking) com notificação sonora e visual para os ocupantes.
- **Modos de Exibição de Chamada**:
  - Mini-Call flutuante com prévias de vídeo integradas ao mapa.
  - Modo Grade em tela cheia com palco principal e barra lateral (Gather Grid).
  - Modo Foco (Spotlight) para destacar participantes individuais.

### 3. Compartilhamento de Tela em Alta Resolução

- **Seleção de Monitores e Janelas**: Captura de telas completas ou aplicativos específicos (editores de código, navegadores, softwares de renderização).
- **Perfis de Taxa de Quadros e Resolução**:
  - 720p a 30 FPS (5.000 kbps) e 60 FPS (6.000 kbps).
  - 1080p a 30 FPS (7.000 kbps) e 60 FPS (8.000 kbps), otimizado para legibilidade de texto e código.
- **Visualizador Imersivo**: Interface com controles auto-ocultáveis e suporte a atalhos de teclado.

### 4. Gerenciamento de Participantes, Papéis e Rede P2P

- **Painel de Usuários**: Listagem em tempo real de membros conectados, localização no mapa e status de dispositivos (microfone, câmera, transmissão de tela).
- **Hierarquia de Permissões**:
  - **Proprietário da Sala (Owner)**: Controle de configurações de privacidade, gestão de permissões de edição de mapa e moderação (expulsão de participantes).
  - **Host de Conexão (Dynamic Superpeer)**: Nó eleito dinamicamente com base na rota de menor latência para atuar como ponto de estabilização da rede P2P.
- **Telemetria de Rede**: Acompanhamento contínuo de latência (RTT em milissegundos) entre nós.
- **Ações Rápidas**: Teleporte para a posição de colegas, chat privado em mensagem direta e lista persistente de favoritos.

### 5. Estúdio de Criação de Sprites e Customização de Elementos

- **Importação de Imagens**: Conversão de arquivos PNG e JPG em elementos de piso, parede e mobília compatíveis com o grid de 32x32 pixels.
- **Ferramentas de Recorte e Transparência**:
  - Seleção livre com alinhamento ao grid.
  - Remoção inteligente de cor de fundo via conta-gotas e presets cromáticos.
- **Composição em Camadas**: Criação de móveis compostos com controle de opacidade, espelhamento e definição de máscaras de colisão.
- **Customização de Avatares**: Sistema modular de camadas para personalização de tom de pele, cabelo, vestimenta e acessórios.

---

## Funcionamento da Conexão P2P (WebRTC)

O sistema adota uma arquitetura híbrida descentralizada, combinando topologia em estrela para controle de estado da sala e topologia em malha (mesh) dinâmica para tráfego de mídia em tempo real:

```
[Cliente A] <====== Data Channel ======> [Host da Sala / Superpeer] <====== Data Channel ======> [Cliente B]
    ||                                                                                                  ||
    || (Entram na mesma Zona Privada)                                                                  ||
    ╚════════════════════════════════ Media Stream Direto (P2P Mesh) ═══════════════════════════════════╝
```

### 1. Topologia Híbrida: Estado vs. Mídia

- **Canal de Dados e Estado (Topologia em Estrela / Superpeer)**:
  - Ao entrar em uma sala, o primeiro participante registra o identificador de host (`gather-v2-[CÓDIGO]-host`).
  - Os demais clientes conectam-se ao Host por meio de canais de dados seguros (`RTCDataChannel` via PeerJS) com entrega ordenada (`ordered: true`).
  - O Host centraliza a retransmissão de coordenadas de movimento dos avatares, mensagens de chat, alterações no mapa em tempo real e sincronização de permissões administrativas.
- **Mídia por Zonas Acústicas (Topologia em Malha Direta)**:
  - Os fluxos de áudio, vídeo e compartilhamento de tela não passam pelo Host nem por servidores intermediários, garantindo tráfego direto ponto a ponto com latência mínima e privacidade ponta a ponta.
  - As conexões de mídia (`MediaConnection`) são estabelecidas sob demanda apenas entre participantes posicionados dentro do mesmo polígono de zona privada ou mesa.
  - Quando um participante sai da zona, todas as conexões de mídia com os membros daquela área são imediatamente fechadas (`call.close()`), liberando recursos de rede e processamento local.

### 2. Resolução Determinística de Conflitos de Chamada (Call Glare)

- **O Problema de Glare**: Em uma rede descentralizada, quando dois participantes entram simultaneamente na mesma zona acústica, ambos disparam uma oferta de conexão um para o outro (A dial B e B dial A). Sem tratamento, isso gera conexões duplicadas, consumo redundante de largura de banda e interrupções na reprodução de vídeo (`AbortError`).
- **Resolução Determinística**: O módulo `mediaCalls.ts` implementa o algoritmo `resolveCallGlare`. Ao detectar uma chamada concorrente, os identificadores de peer de ambos os lados são comparados lexicograficamente (`myId < remoteId`). A ligação originada pelo nó com o menor identificador prevalece, enquanto a concorrente é descartada de forma simétrica em ambos os clientes sem necessidade de troca de mensagens de controle adicionais.

### 3. Estabelecimento de Transporte, ICE, STUN e Fallback TURN

- **Pool de Candidatos Antecipado (`iceCandidatePoolSize: 4`)**:
  - Candidatos ICE são coletados previamente antes do início da chamada. Isso elimina o atraso de 500 ms a 2.000 ms nas primeiras conexões WebRTC, evitando atraso ou corte.
- **Topologia de Travessia NAT (STUN/TURN)**:
  - O sistema tenta conexões diretas via candidatos locais (`host`) e reflexivos públicos (`srflx`) utilizando servidores STUN do Google e Twilio.
  - Para ambientes com restrições severas de rede (NAT simétrico, firewalls corporativos ou redes móveis restritivas), o sistema conta com servidores TURN (OpenRelay Metered nas portas 80 e 443) como camada de contingência (relay). A rota de relay só é selecionada caso o roteamento direto seja inviável.
- **Otimização de Portas UDP (`max-bundle` e `rtcp-mux`)**:
  - Todas as faixas de áudio, vídeo e mensagens de controle RTCP são multiplexadas em uma única porta UDP compartilhada por sessão, minimizando o número de portas abertas na tabela NAT do roteador.

### 4. Gerenciamento Adaptativo de Buffer de Jitter (Dynamic Buffer)

- O `DynamicBufferManager` monitora continuamente os parâmetros de qualidade da conexão (RTT, variação de atraso/jitter e taxa de perda de pacotes).
- **Tratamento Diferenciado por Tipo de Mídia**:
  - **Áudio Vocal**: Prioriza fluidez conversacional. Em conexões estáveis, o playout delay opera em 1 ms; em redes com alta oscilação de pacotes, é limitado a no máximo 500 ms, evitando atrasos que levam participantes a falarem simultaneamente.
  - **Vídeo e Compartilhamento de Tela**: O buffer se adapta entre 100 ms e 500 ms para absorver oscilações de quadros e manter a taxa contínua de 60 FPS sem congelamentos visíveis.

### 5. Eleição de Host e Recuperação de Falhas (Failover)

- **Detecção de Queda de Conexão**: O sistema executa um ciclo de heartbeat a cada 2 segundos. Se um peer não responder por mais de 10 segundos (`peerLastSeen`), sua conexão é encerrada e seus recursos são liberados.
- **Autohospedagem e Superpeer**: Caso o Host original sofra desconexão inesperada, os clientes restantes detectam a ausência de sinalização e podem assumir automaticamente o papel de coordenação da sala ou transferir a liderança para o participante de melhor rota e menor ping, preservando a continuidade da sessão para os demais membros.

---

## Arquitetura do Sistema

O projeto é estruturado segundo princípios de modularidade e separação de responsabilidades:

- **Motor de Renderização (`src/engine/rendering/`)**:
  - `floorRenderer.ts`: Renderização de pisos nativos e texturas personalizadas.
  - `wallRenderer.ts`: Paredes estruturais e iluminação temática.
  - `zoneRenderer.ts`: Delimitação de zonas acústicas privadas.
  - `furnitureRenderer.ts`: Renderização e profundidade de mobílias e sprites compostos.
  - `worldRenderer.ts`: Coordenação de viewport, culling de tiles e ordenação por profundidade.
- **Áudio e Processamento de Sinais (`src/media/`)**:
  - `NoiseSuppressor.ts`: Implementação do motor DSP Clássico e cadeia de filtros Web Audio.
  - `SoftDspProcessor.ts`: Implementação do motor DSP Suave com expansor descendente.
  - `RnnoiseProcessor.ts`: Gerenciamento do ciclo de vida do worklet neural em WebAssembly.
  - `MicCalibrator.ts`: Medição acústica, cálculo de mediana de ruído e geração de amostras offline.
  - `audioBufferUtils.ts`: Codificação WAV PCM 16-bit, renderização offline e extração de waveforms.
  - `CallAudioIsolator.ts`: Isolamento de áudio de processos e prevenção de realimentação em chamadas.
- **Rede e Conectividade P2P (`src/p2p/`)**:
  - `PeerManager.ts`: Inicialização, heartbeat e coordenação de nós PeerJS.
  - `mediaCalls.ts`: Sinalização e negociação de canais WebRTC de áudio, vídeo e tela.
  - `messageHandlers.ts`: Protocolo binário/JSON de sincronização de estado, posições e eventos.
- **Camada Nativa Desktop (`native/` e `electron/`)**:
  - `native/process-audio-capture/`: Módulo em C++ para captura WASAPI Loopback em nível de processo no Windows.
  - `electron/main.ts`: Janela principal, inicialização de binários nativos e manipulação de fontes de captura de tela.

---

## Tecnologias Utilizadas

| Camada | Tecnologia |
| :--- | :--- |
| **Interface do Usuário** | React 18, TypeScript, TailwindCSS, Lucide Icons |
| **Plataforma Desktop** | Electron 33 |
| **Build & Bundler** | Vite 6 |
| **Comunicação em Tempo Real** | WebRTC, PeerJS |
| **Gerenciamento de Estado** | Zustand |
| **Processamento de Áudio** | Web Audio API, WebAssembly (@jitsi/rnnoise-wasm), WASAPI C++ |
| **Testes Automatizados** | Vitest (46 arquivos de teste, 278 testes unitários) |

---

## Execução e Desenvolvimento

### Pré-requisitos
- Node.js versão 18 ou superior.
- Git instalado.
- Visual Studio C++ Build Tools (necessário apenas para compilar o módulo nativo de captura de áudio em ambiente Windows).

### 1. Obtenção do Código
```bash
git clone https://github.com/C1ean-dev/gather-clone.git
cd gather-clone
```

### 2. Instalação das Dependências
```bash
npm install
```

### 3. Modo Desenvolvimento

- **Interface Web (Navegador)**:
```bash
npm run dev
```

- **Aplicação Desktop (Electron)**:
```bash
npm run electron:dev
```

- **Sessão Dupla para Testes P2P (Dois clientes simultâneos)**:
```bash
npm run electron:dual
```

### 4. Testes Automatizados
```bash
npm test
```

Para executar em modo interativo contínuo:
```bash
npm run test:watch
```

### 5. Verificação de Tipos TypeScript
```bash
npx tsc --noEmit
```

### 6. Compilação de Produção

- **Bundle Web e Electron**:
```bash
npm run build
```

- **Instalador Desktop (.exe)**:
```bash
npm run electron:build
```

---

## Licença

Este projeto é distribuído sob os termos da licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais informações.
