# 🏨 Gather V2 — Espaço Virtual & Chamadas P2P em Pixel Art

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-blue?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Electron-30.0-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/WebRTC-P2P_Mesh-FF6B6B" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Tests-30%20Passed-emerald" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

> Um espaço virtual interativo para reuniões, coworking e encontros com amigos, combinando a estética clássica em **Pixel Art** com chamadas de voz e vídeo por **Zonas Privadas**, supressor de ruído com **Web Audio DSP**, **Estúdio de Criação de Sprites Customizados**, **Gerenciamento de Participantes & Permissões** e compartilhamento de tela em **1080p @ 60 FPS**.

---

## ✨ Principais Recursos

### 👥 1. Menu de Participantes, Amigos & Permissões
- **Painel de Pessoas Online**: Acesso instantâneo a todos os membros conectados na sala, seus avatares, localização atual no mapa e status de mídia (microfone, câmera, tela compartilhada).
- **Distinção entre Dono & Host de Conexão**:
  - **👑 Dono da Sala (Owner)**: O criador do espaço, detentor das permissões de administração, configuração de privacidade (Pública/Privada), gestão de cargos e moderação.
  - **⚡ Host de Conexão (Dynamic Superpeer)**: O nó da rede que possui a melhor rota e menor latência (ping), garantindo estabilidade e disponibilidade da retransmissão P2P. O Dono pode reatribuir o Host de Conexão a qualquer momento.
- **Telemetria de Ping em Tempo Real**: Medição de RTT em milissegundos com indicadores visuais de qualidade (🟢 Excelente, 🟡 Médio, 🔴 Lento).
- **Ações de Interação**:
  - 📍 **Ir até (Teleporte)**: Movimenta instantaneamente seu avatar até o colega selecionado.
  - 💬 **Mensagem Direta**: Atalho para conversa privada no chat.
  - ⭐ **Favoritos / Amigos**: Salve colegas na lista persistente de amigos.
  - 🛡️ **Gerenciador de Permissões (Dono)**: Promova cargos (**Admin**, **Membro**, **Visitante**), conceda/revogue autorização para **Editar o Mapa & Móveis**, e aplique **Expulsão da Sala (Kick)**.

---

### 🎨 2. Estúdio de Criação de Elementos & Sprites (Custom Element Studio)
- **Importação de Imagens e Spritesheets**: Carregue arquivos PNG ou JPG e transforme-os em mobílias, pisos ou paredes pixeladas.
- **Crop Studio com Remoção de Fundo**:
  - Ferramenta de recorte com seleção livre e snap-to-grid de 32x32px.
  - Remoção inteligente de fundo com conta-gotas e presets de cores transparentes (Magenta, Verde, Ciano, Branco, Preto).
- **Composition Studio Multicamadas**:
  - Crie móveis compostos organizando múltiplos recortes em camadas com opacidade, espelhamento horizontal e redimensionamento proporcional.
  - Pinte matrizes de colisão e áreas de bloqueio de passagem com precisão de blocos.
- **Animation Timeline**: Crie mobílias e decorações animadas com controle de taxa de quadros (FPS).

---

### 🏨 3. Espaços Virtuais em Pixel Art & Editor em Tempo Real
- **Renderizador Canvas 2D Otimizado**: Renderização pixelada nítida (`image-rendering: pixelated`) com 60 FPS contínuos e viewport culling.
- **Espaço em Branco 100% Customizável**:
  - Construa salas, escritórios, áreas de lazer e mesas de reunião a partir de um espaço limpo.
- **Catálogo Completo de Móveis, Pisos & Paredes**:
  - Sofás, mesas executivas, computadores, balcões, máquinas de café, decorações retrô, parquet de madeira e carpetes.
- **Editor de Zonas Privadas & Sincronização P2P**:
  - Pinte pisos, levante paredes, posicione mobílias e demarque áreas com áudio isolado que são sincronizadas instantaneamente com todos os participantes via WebRTC.

---

### 📞 4. Chamadas de Vídeo & Áudio por Zonas Privadas
- **Isolamento Acústico Automático**: O áudio e o vídeo conectam **automaticamente** apenas quando os avatares entram na mesma sala demarcada ou mesa de reunião.
- **Mini-Call Flutuante**: Miniaturas de vídeo no canto da tela enquanto você navega livremente pelo mapa.
- **Modo Grade / Reunião Completa (Gather Grid)**: Visualização em tela cheia com palco principal e barra lateral de participantes.
- **Modo Foco (Spotlight)**: Destaque qualquer participante no centro da conferência com um único clique.

---

### 🖥️ 5. Compartilhamento de Tela em 1080p @ 60 FPS
- **Seletor de Janelas e Telas**: Compartilhe monitores inteiros ou janelas específicas de programas (VS Code, Jogos, Navegador).
- **Bitrates de Alta Definição (WebRTC Otimizado)**:
  - `720p @ 30 FPS`: 5.000 kbps
  - `720p @ 60 FPS`: 6.000 kbps
  - `1080p @ 30 FPS`: 7.000 kbps
  - `1080p @ 60 FPS`: 8.000 kbps (Total nitidez para leitura de texto e código)
- **Visualizador em Tela Cheia**: Interface imersiva com controles flutuantes auto-ocultáveis e atalho `ESC`.

---

### 🪄 6. Supressor de Ruído DSP com Web Audio API
- **Highpass Filter**: Elimina ruídos graves de fundo como ventiladores e ar-condicionado (< 90Hz).
- **High-Shelf Filter**: Atenua cliques agudos de teclados mecânicos (> 6500Hz).
- **Spectral Noise Gate Dinâmico**: Corta a captação quando você não estiver falando.
- **Compressor Dinâmico**: Nivelamento automático de volume para clareza da voz.

---

### 💬 7. Chat Multicanal & Customizador de Avatares
- **Canais de Texto**: `#general`, `#social` e `#zona-atual` (chat restrito à sala onde seu avatar está posicionado).
- **Reações com Emojis**: Emojis flutuantes animados sobre a cabeça do avatar e no dock da chamada.
- **Customizador de Avatar com 10 Camadas**: Peles, cabelos, camisetas, calças, sapatos e acessórios (Fones 🎧, Óculos 👓, Bonés 🧢).
- **Status de Presença**: Disponível 🟢, Em Reunião 🔴, Modo Foco 🟣 e Ausente 🟡.

---

## 🏛️ Arquitetura e Princípio de Responsabilidade Única (SRP)

O projeto foi totalmente modularizado para manter o código limpo, testável e manutenível:

- **Renderização Gráfica (`src/engine/rendering/`)**:
  - `floorRenderer.ts`: Renderização de pisos nativos e texturas personalizadas.
  - `wallRenderer.ts`: Paredes, iluminação e temas arquitetônicos de salas.
  - `zoneRenderer.ts`: Fronteiras, divisórias de áudio e badges de zonas privadas.
  - `furnitureRenderer.ts`: Móveis do catálogo e sprites customizados em múltiplas camadas.
  - `worldRenderer.ts`: Viewport tile culling, ghost preview de mobílias e reactions.
- **Renderização de Avatares (`src/engine/avatar/`)**:
  - `hairRenderer.ts`, `faceRenderer.ts`, `clothingRenderer.ts`, `accessoryRenderer.ts`, `nameTagRenderer.ts`.
- **Física e Entrada (`src/engine/`)**:
  - `collision.ts`: Detecção de colisão 1:1, paredes finas, portas e zonas.
  - `CameraManager.ts`: Câmera suave, zoom e projeção de coordenadas tela-para-tile.
  - `InputHandler.ts`: Controles via teclado (WASD) e clique para mover.
- **Comunicação P2P (`src/p2p/`)**:
  - `messageHandlers.ts`: Roteamento e processamento de pacotes de rede.
  - `mediaCalls.ts`: Negociação e ciclo de vida de streams WebRTC de áudio, vídeo e tela.
  - `PeerManager.ts`: Coordenação central de conexões PeerJS e heartbeat de latência.

---

## 📦 Tecnologias Utilizadas

- **Frontend**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [TailwindCSS](https://tailwindcss.com/)
- **Desktop Runtime**: [Electron 30](https://www.electronjs.org/)
- **Build Tool**: [Vite 5](https://vitejs.dev/)
- **Rede P2P / WebRTC**: [PeerJS](https://peerjs.com/)
- **Gerenciamento de Estado**: [Zustand](https://github.com/pmndrs/zustand)
- **Áudio DSP**: Web Audio API Nativa
- **Testes Automatizados**: [Bun Test](https://bun.sh/)
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+) ou [Bun](https://bun.sh/)

### 1. Clonar o Repositório
```bash
git clone https://github.com/C1ean-dev/gather-clone.git
cd gather-clone
```

### 2. Instalar as Dependências
```bash
npm install
# ou
bun install
```

### 3. Executar em Modo Desenvolvimento
```bash
npm run dev
# ou no Bun:
bun run dev
```

### 4. Executar Testes Automatizados
```bash
bun test
```

### 5. Checagem de Tipos TypeScript
```bash
bun x tsc --noEmit
```

### 6. Gerar Build de Produção
```bash
npm run build
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais detalhes.
