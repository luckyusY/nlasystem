"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

type Props = { children: ReactNode; resetKey: string };
type State = { error: Error | null };

export default class RuntimeBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("NLA workspace component failed", { error, componentStack: info.componentStack });
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <section className="runtime-recovery" role="alert"><span><ShieldAlert size={26} aria-hidden /></span><p>Workspace recovery</p><h2>This map or analysis could not finish rendering.</h2><div>Other NLA GeoAI pages remain available. Retry this workspace; if the issue repeats, review System Health and preserve the input/source details for support.</div><button onClick={() => this.setState({ error: null })}><RefreshCw size={15} aria-hidden />Retry workspace</button><details><summary>Technical detail</summary><code>{this.state.error.message}</code></details></section>;
  }
}
