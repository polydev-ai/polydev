# Gemini CLI

Install Google Cloud SDK and authenticate. Polydev will prefer your local CLI when available.

```bash
gcloud auth login
gcloud auth application-default login
```

## Gotchas
- Ensure `gcloud` is on PATH for your editor process, not just the terminal.
- Enable required APIs in the correct project; auth can point to a different GCP project than expected.
