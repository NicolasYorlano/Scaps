import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Ataja los errores de render de sus hijos: avisa por onError y no dibuja nada. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
