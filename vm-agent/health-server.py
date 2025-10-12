#!/usr/bin/env python3
"""
Minimal VM Agent for Firecracker VMs
Provides health check endpoint and credential receiver endpoint
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import sys
from pathlib import Path

class VMAgentHandler(BaseHTTPRequestHandler):
    """HTTP handler for VM agent endpoints"""

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'ok')
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/credentials/write':
            try:
                # Read request body
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                data = json.loads(body.decode('utf-8'))

                # Extract path, content, and mode
                file_path = data.get('path')
                content = data.get('content')
                mode = data.get('mode', '0600')

                if not file_path or not content:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Missing path or content'}).encode())
                    return

                # Create parent directory if needed
                parent_dir = Path(file_path).parent
                parent_dir.mkdir(parents=True, exist_ok=True)

                # Write file
                with open(file_path, 'w') as f:
                    f.write(content)

                # Set file permissions
                os.chmod(file_path, int(mode, 8))

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'path': file_path}).encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Suppress default logging to avoid spam"""
        return

def main():
    """Start HTTP server"""
    server_address = ('0.0.0.0', 8080)
    httpd = HTTPServer(server_address, VMAgentHandler)
    print(f'VM Agent listening on {server_address[0]}:{server_address[1]}', file=sys.stderr)
    sys.stderr.flush()
    httpd.serve_forever()

if __name__ == '__main__':
    main()
