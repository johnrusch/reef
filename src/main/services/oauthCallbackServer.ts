import { createServer, Server } from 'http';
import { parse } from 'url';

export class OAuthCallbackServer {
  private server: Server | null = null;
  private port: number = 3001;
  private resolveCallback: ((result: { code?: string; state?: string; error?: string }) => void) | null = null;

  start(): Promise<{ code?: string; state?: string; error?: string }> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close();
      }

      this.resolveCallback = resolve;

      this.server = createServer((req, res) => {
        const parsedUrl = parse(req.url || '', true);
        
        if (parsedUrl.pathname === '/auth/github/callback') {
          const { code, state, error, error_description } = parsedUrl.query;

          res.writeHead(200, { 'Content-Type': 'text/html' });
          
          if (error) {
            res.end(`
              <!DOCTYPE html>
              <html>
              <head><title>Authentication Failed</title></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #e53e3e;">Authentication Failed</h1>
                <p style="color: #666;">${error_description || error}</p>
                <p style="color: #666;">You can close this window and try again.</p>
              </body>
              </html>
            `);
            
            this.resolveCallback?.({ error: error as string });
          } else if (code && state) {
            res.end(`
              <!DOCTYPE html>
              <html>
              <head><title>Authentication Successful</title></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #38a169;">Authentication Successful!</h1>
                <p style="color: #666;">You have successfully connected your GitHub account.</p>
                <p style="color: #666;">You can close this window and return to Reef.</p>
                <script>
                  setTimeout(() => window.close(), 3000);
                </script>
              </body>
              </html>
            `);
            
            this.resolveCallback?.({ code: code as string, state: state as string });
          } else {
            res.end(`
              <!DOCTYPE html>
              <html>
              <head><title>Authentication Error</title></head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #e53e3e;">Authentication Error</h1>
                <p style="color: #666;">Missing required parameters. Please try again.</p>
              </body>
              </html>
            `);
            
            this.resolveCallback?.({ error: 'Missing required parameters' });
          }

          this.stop();
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, 'localhost', () => {
        console.log(`OAuth callback server listening on http://localhost:${this.port}`);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.resolveCallback = null;
  }
}