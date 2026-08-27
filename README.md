# 🏨 Habbo Gather V2 — Virtual Space & P2P Video Calls

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-blue?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Electron-30.0-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/WebRTC-P2P_Mesh-FF6B6B" alt="WebRTC" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

> Um espaço virtual interativo para chamadas, coworking e encontros com amigos, combinando a estética nostálgica em **Pixel Art inspirada no clássico Habbo Hotel** com recursos modernos de chamadas por zonas privadas, supressor de ruído com Web Audio DSP, chat multicanal e compartilhamento de tela em **1080p 60 FPS**.

---

## ✨ Principais Recursos

### 🏨 1. Espaços Virtuais em Pixel Art (Tema Habbo Hotel)
- **Renderizador Canvas 2D Otimizado**: Renderização pixelada nítida (`image-rendering: pixelated`) com 60 FPS constantes.
- **Modelos Prontos Nostálgicos**:
  - 🏨 **Habbo Hotel Lobby (Recepção Clássica)**: Balcão de check-in, Sala VIP Habbo Club (HC), Suíte Executiva, Teleportes e o lendário Pato Amarelo 🦆.
  - 🏖️ **Habbo Rooftop & Piscina**: Piscina pública com espreguiçadeiras, pista de dança iluminada e cabine de DJ do Clube Massiva.
  - 🏢 **Tech Startup HQ**: Escritório corporativo com ilhas de time e salas de reunião.
- **Catálogo de Mobílias (Furni) & Raros**:
  - Sofás HC verdes com botões dourados, Candeeiro Dragão de Fogo Raro 🔥, Mesas Executivas de Mogno, Balcões de Recepção, Máquinas de Refrigerante, Plantas Yucca e TVs retrô.
- **Movimentação Suave**: Controle por teclado (**WASD / Setas**) ou **Clique para Mover (Pathfinding)**.

---

### 📞 2. Chamadas de Vídeo & Áudio por Zonas Privadas
- **Isolamento Acústico por Área**: As chamadas de vídeo e voz conectam **automaticamente** apenas quando os avatares entram na mesma mesa ou sala demarcada.
- **Visualização Flexível**:
  - **Mini-Call Flutuante**: Miniaturas no canto do mapa enquanto você caminha pelo espaço.
  - **Modo Grade / Reunião Completa**: Visualização expandida com palco principal e barra lateral compacta de participantes.
  - **Modo Foco (Spotlight)**: Clique em qualquer amigo para colocá-lo em destaque na tela principal.

---

### 🖥️ 3. Compartilhamento de Tela Avançado (Até 1080p @ 60 FPS)
- **Seletor de Monitores e Janelas de Aplicativos**: Escolha entre transmitir sua tela inteira ou apenas uma janela específica (VS Code, Jogos, Navegador, Spotify).
- **Taxas de Bitrate Otimizadas (Sem Borrões no WebRTC)**:
  - `720p @ 30 FPS`: 5.000 kbps
  - `720p @ 60 FPS`: 6.000 kbps
  - `1080p @ 30 FPS`: 7.000 kbps
  - `1080p @ 60 FPS`: 8.000 kbps (Nitidez total para leitura de código e jogos)
- **Áudio do Sistema Integrado**: Mixagem em tempo real do som do aplicativo com a voz do seu microfone.
- **Reprodutor de Live 100% em Tela Cheia**: Expanda a apresentação para ocupar todo o monitor com controles flutuantes auto-ocultáveis e suporte à tecla `ESC`.

---

### 🪄 4. Supressor de Ruído DSP com Web Audio API
- **Filtro Passa-Alta (Highpass)**: Elimina ruídos graves de fundo como ventiladores, ar-condicionado e vibrações de mesa (< 90Hz).
- **High-Shelf Filter**: Atenua cliques agudos de teclados mecânicos (> 6500Hz).
- **Spectral Noise Gate Dinâmico**: Corta microfonia e ruído ambiente quando ninguém está falando.
- **Compressor Dinâmico**: Nivelamento automático do volume da voz para maior clareza.

---

### 🛠️ 5. Editor de Espaços em Tempo Real
- **Ferramentas de Construção**: Pinte pisos, levante paredes, posicione mobílias e desenhe novas Zonas Privadas.
- **Sincronização P2P Instantânea**: Todas as alterações feitas no mapa são transmitidas em tempo real para os amigos conectados na sala.
- **Ferramenta de Borracha**: Remoção rápida de qualquer mobília ou divisória.

---

### 💬 6. Chat Multicanal & Customizador de Avatares
- **Canais de Texto**: `#general`, `#social` e `#zona-atual` (chat restrito à sala em que seu avatar se encontra).
- **Reações com Emojis**: Emojis flutuantes sobre a cabeça do avatar e no dock da chamada.
- **Customizador de Avatar**: Estilos e cores de cabelo, camisetas, calças, tons de pele e acessórios (Fones de Ouvido 🎧, Óculos 👓, Bonés 🧢).
- **Status de Presença**: Disponível 🟢, Em Reunião 🔴, Modo Foco 🟣 e Ausente 🟡.

---

## 🌐 Arquitetura de Rede: Host-and-Join P2P

O aplicativo opera em arquitetura **P2P Mesh via WebRTC (PeerJS)** com servidores STUN/TURN públicos, dispensando a necessidade de servidores dedicados de mídia:
1. O **Host** cria uma sala e recebe um código de acesso amigável (ex: `GATHER-A8X3K`).
2. Os **Participantes** digitam o código e entram na sala.
3. As posições no mapa, chat, layout do espaço e streams de áudio/vídeo são sincronizados diretamente entre os pares conectados.

---

## 📦 Tecnologias Utilizadas

- **Frontend**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [TailwindCSS](https://tailwindcss.com/)
- **Desktop Runtime**: [Electron 30](https://www.electronjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Rede P2P / WebRTC**: [PeerJS](https://peerjs.com/)
- **Gerenciamento de Estado**: [Zustand](https://github.com/pmndrs/zustand)
- **Áudio DSP**: Web Audio API nativa
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- `npm` ou `yarn`

### 1. Clonar o Repositório
```bash
git clone https://github.com/SEU_USUARIO/habbo-gather-v2.git
cd habbo-gather-v2
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Executar em Modo Desenvolvimento

#### Como Aplicativo Desktop (Electron):
```bash
npm run electron:dev
```

#### Como Aplicação Web (Navegador):
```bash
npm run dev
```

### 4. Gerar Build de Produção
```bash
npm run build
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja `LICENSE` para mais informações.
