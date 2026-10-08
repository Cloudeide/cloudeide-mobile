# CloudeIDE for iOS and Android

Your agent, in your pocket. Send a task to CloudeIDE on your computer, watch
every step, answer its questions, and keep or undo the result.

The agent does not run on the phone. It runs in the CloudeIDE desktop app, on
your own computer and your own files; this app sends it work through
`api.cloudeide.com` and shows what it does. The first time, the computer asks
"Connect … to this computer?" with a six-digit code that this app shows too.

## Screens

1. **Sign in** — in the browser, with the same account as the desktop app.
2. **Computers** — every computer signed in to the desktop app, online or not.
3. **Chat** — type a task or speak it with the keyboard's microphone.
4. **Live activity** — each step, the reply as it is written, and questions
   (Allow / Skip) when a command waits for you.
5. **Review** — the changed files, Keep or Undo, and deploy a preview.

## Builds

- **Android**: every push to `main` builds an installable `.apk`
  (Actions → *Android build* → Artifacts).
- **iPhone**: needs an Apple Developer account. The steps are in
  `docs/MOBILE.md` in the server repository.

## Working on it

```
npm install
npm run typecheck
npm test
npx expo run:android   # needs Android Studio, or use the Actions build
```

Built with Expo (SDK 57) and Expo Router; screens are in `src/app/`, the
server calls in `src/lib/api.ts`, and the conversation logic, which has tests,
in `src/lib/timeline.ts`.
