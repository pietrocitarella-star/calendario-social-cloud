<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Social Media Editorial Calendar

Questa è la tua applicazione per la gestione del calendario editoriale, configurata per salvare i dati su **Firebase** (Cloud) e pronta per essere ospitata su **Netlify**.

## 1. Installazione Locale

Per far girare l'app sul tuo computer per fare modifiche:

1.  Assicurati di avere Node.js installato.
2.  Apri il terminale nella cartella del progetto.
3.  Installa le dipendenze:
    ```bash
    npm install
    ```
4.  Avvia l'app:
    ```bash
    npm run dev
    ```
5.  Apri il link che appare (solitamente `http://localhost:5173`).

---

## 2. Configurazione Database (Firebase)

Affinché l'app funzioni online e i dati siano condivisi tra colleghi, devi collegarla a Firebase:

1.  Vai su [console.firebase.google.com](https://console.firebase.google.com/).
2.  Crea un progetto e un **Firestore Database** (in modalità test).
3.  Vai nelle impostazioni del progetto -> Generali -> Le tue app -> Icona Web (</>).
4.  Copia la configurazione `firebaseConfig`.
5.  Incolla i valori nel file `src/firebaseConfig.ts` del tuo progetto.

---

## 3. Messa Online (Deploy su Netlify)

Per rendere l'app accessibile a tutti via internet:

**Metodo Semplice (Drag & Drop):**

1.  Nel terminale del tuo progetto, esegui:
    ```bash
    npm run build
    ```
    Questo creerà una cartella chiamata `dist`.

2.  Vai su [app.netlify.com/drop](https://app.netlify.com/drop).
3.  Trascina la cartella `dist` all'interno della pagina.
4.  Attendi il caricamento: il link che ti verrà fornito è il tuo sito web funzionante!
