import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
    path?: string;
}

const Terminal = ({ path }: TerminalProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xterm = useRef<XTerm | null>(null);
    const socket = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize XTerm
        xterm.current = new XTerm({
            cursorBlink: true,
            theme: {
                background: '#0f172a', // slate-900
                foreground: '#f1f5f9', // slate-100
                cursor: '#3b82f6', // black-500
            },
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontSize: 13,
        });

        const fitAddon = new FitAddon();
        xterm.current.loadAddon(fitAddon);
        xterm.current.open(terminalRef.current);
        fitAddon.fit();

        // Connect WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3000/ws/terminal`;
        socket.current = new WebSocket(wsUrl);

        socket.current.onopen = () => {
            if (path) {
                setTimeout(() => {
                    socket.current?.send(`cd ${path}\n`);
                    socket.current?.send(`clear\n`);
                }, 500);
            }
        };

        socket.current.onmessage = (event) => {
            if (event.data instanceof Blob) {
                event.data.arrayBuffer().then(buf => {
                    xterm.current?.write(new Uint8Array(buf));
                });
            } else {
                xterm.current?.write(event.data);
            }
        };

        // Terminal input to socket
        xterm.current.onData(data => {
            if (socket.current?.readyState === WebSocket.OPEN) {
                socket.current.send(data);
            }
        });

        // Resize handling
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            socket.current?.close();
            xterm.current?.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [path]);

    return (
        <div className="h-full w-full bg-[#0f172a] p-2 overflow-hidden hide-scrollbar">
            <div ref={terminalRef} className="h-full w-full hide-scrollbar" />
        </div>
    );
};

export default Terminal;
