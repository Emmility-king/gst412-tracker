# GST412 Manual Payment Tracker

A Next.js app for collecting receipt submissions and issuing individually stamped GST412 manuals after staff verify payment.

## Required payment

- Account name: Wellspring University Ventures
- Bank: Zenith Bank
- Account number: 1310392285
- Amount: NGN 2,000
- Matric number format: 3 department letters + 2 entry-year digits + 3 serial digits, with no separators (for example, `MER24001`)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Copy `.env.example` to `.env.local` and replace `PAYMENT_REVIEW_PASSWORD` with a long private password. Restart the server after setting it.

## Separate profiles

- Students sign in at `/student/login` with their name and matric number, then use `/student` to submit a receipt and track their own payment.
- Staff sign in at `/staff/login` with the configured review password, then use `/staff` to review receipts and approve or reject payments.

The student sign-in issues a profile session from the supplied name and matric number; it does not check a university enrollment directory. Connect institutional authentication or a student roster if enrollment-level identity verification is required.

Payment records and uploaded receipt images are stored under `data/` and are not public static files. Back them up and restrict access to the machine. The JSON file store is intended for one local app instance; use a shared database and private object storage before deploying multiple instances or serverless production hosting.

## Student flow and verification

Students upload a JPG, PNG, or WEBP receipt image (maximum 10 MB). English OCR runs in the browser to suggest a receipt reference, transaction number, transfer number, or teller ID. Students review the suggestion, enter their matric number and name, and submit the receipt. The server stores the image privately while the record waits for staff review.

At `/admin`, staff enter the configured password, inspect the uploaded receipt, and approve or reject the submission. Approval creates the manual ID and changes the payment status to verified. Only verified records can return a barcode or download a manual PDF. Students can check the payment status at `/track` or refresh it on the submission page.

The app does not connect to Zenith Bank. Staff must independently confirm settlement using the university's normal payment records before approving. OCR and a submitted receipt are not, by themselves, confirmation that funds settled.

## Personalized manual

The supplied manual source is `manual/GST412-manual-source.txt`; its generated PDF is `manual/GST412-manual.pdf`. Rebuild it after editing the text with `node scripts/build-manual.mjs`. After staff approval, the downloaded PDF receives a cover with the student's name, matric number, verified payment reference, manual ID, and barcode. The matric number and manual ID are also printed in each page footer, alongside the barcode.
