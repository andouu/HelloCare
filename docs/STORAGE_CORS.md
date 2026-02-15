# Firebase Storage CORS setup

Uploads from the browser (e.g. Upload Care Packet) hit Firebase Storage from your app’s origin (e.g. `http://localhost:3000`). The bucket must allow that origin via CORS or the browser blocks the request.

## One-time setup

1. **Install Google Cloud SDK** (includes `gsutil` and `gcloud`):
   - https://cloud.google.com/sdk/docs/install

2. **Authenticate** (if you haven’t already):
   ```bash
   gcloud auth login
   gcloud config set project hellocare-f045e
   ```

3. **Apply CORS** using the config in the repo root:
   ```bash
   # From the project root
   gsutil cors set storage.cors.json gs://hellocare-f045e.firebasestorage.app
   ```
   If that bucket name fails, try:
   ```bash
   gsutil cors set storage.cors.json gs://hellocare-f045e.appspot.com
   ```

4. **Confirm** (optional):
   ```bash
   gsutil cors get gs://hellocare-f045e.firebasestorage.app
   ```

After this, reload your app and try the upload again from `http://localhost:3000`.
