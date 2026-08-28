import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Gather V2:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleResetAll = () => {
    if (window.confirm('Deseja resetar as configurações e cache local do app para corrigir o erro?')) {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (e) {
        console.error(e)
      }
      window.location.reload()
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e14] p-6 text-slate-100 font-sans select-none">
          <div className="bg-[#1b202c] border border-rose-500/30 rounded-3xl p-8 max-w-xl w-full shadow-2xl space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Ops! Ocorreu um erro ao carregar a tela</h2>
                <p className="text-xs text-slate-400">O Gather V2 encontrou uma falha de renderização</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-[#12151d] border border-[#2a3142] rounded-2xl p-4 overflow-auto max-h-48">
                <p className="text-xs font-mono text-rose-300 font-bold break-words">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-[10px] font-mono text-slate-500 mt-2 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Aplicação</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAll}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 font-semibold text-xs border border-slate-700 hover:border-rose-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                title="Limpa o localStorage e restaura os dados padrão"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar Cache & Resetar</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
