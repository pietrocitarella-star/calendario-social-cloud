# ISTRUZIONI OPERATIVE E CONFIGURAZIONE PROGETTO

Questo documento riassume i passaggi effettuati per configurare il Calendario Editoriale su Cloud (Firebase) e pubblicarlo online (Netlify).

---

## 1. CONFIGURAZIONE FIREBASE (Backend e Database)

### A. Creazione Progetto
1. Vai su [console.firebase.google.com](https://console.firebase.google.com/).
2. Crea un nuovo progetto (es. "CalendarioSocial").

### B. Attivazione Database (Firestore)
1. Nel menu a sinistra: **Compilazione (Build)** -> **Firestore Database**.
2. Clicca **Crea database**.
3. Scegli la location (es. `eur3` o `us-central`).
4. **Regole di sicurezza iniziali**: Seleziona "Modalità di test" (aperto per 30 giorni) o imposta subito le regole di sicurezza (vedi sezione D).

### C. Attivazione Autenticazione (Login)
1. Nel menu a sinistra: **Compilazione** -> **Authentication**.
2. Clicca **Inizia**.
3. Seleziona **Email/Password** come metodo di accesso.
4. Attiva l'interruttore **Abilita** e Salva.
5. Vai nella scheda **Users** e clicca **Aggiungi utente** per creare le credenziali per te e i tuoi colleghi.

### D. Regole di Sicurezza (Obbligatorio per produzione)
Per impedire accessi non autorizzati, vai su **Firestore Database** -> **Regole (Rules)** e incolla questo codice:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Consenti lettura e scrittura SOLO se l'utente è loggato
      allow read, write: if request.auth != null;
    }
  }
}
```
Clicca su **Pubblica**.

### E. Collegamento all'App
1. In Firebase Console: **Impostazioni progetto** (ingranaggio) -> **Generali**.
2. Scorri in basso a "Le tue app" -> Clicca l'icona web `</>`.
3. Registra l'app (es. "Web App").
4. Copia i valori di `firebaseConfig` (apiKey, authDomain, etc.).
5. Incolla questi valori nel file del progetto `src/firebaseConfig.ts`.

---

## 2. DEPLOY SU NETLIFY (Messa online)

### Metodo Manuale (Drag & Drop)
1. Apri il terminale nella cartella del progetto.
2. Esegui il comando per costruire l'app:
   ```bash
   npm run build
   ```
3. Verrà creata una cartella `dist`.
4. Vai su [app.netlify.com/drop](https://app.netlify.com/drop).
5. Trascina la cartella `dist` nella pagina.
6. Il sito è online!

### Aggiornamenti Futuri
Se colleghi il progetto a GitHub, Netlify si aggiornerà automaticamente ogni volta che fai un "push" del codice.

---

## 3. RISOLUZIONE PROBLEMI COMUNI

- **Errore "Permission Denied" / Pagina bianca**:
  - Verifica di essere loggato.
  - Verifica che le Regole di Sicurezza su Firebase siano corrette (vedi punto 1.D).
  - Controlla la console del browser (F12) per errori rossi.

- **Errore "Function addDoc() called with invalid data"**:
  - Significa che stai cercando di salvare un campo `undefined`. L'app è stata aggiornata per pulire automaticamente questi dati, ma verifica di non avere campi vuoti anomali.

- **Refresh della pagina su Netlify dà "Page Not Found"**:
  - Assicurati che il file `public/_redirects` sia presente nel progetto con il contenuto `/* /index.html 200`.

---

## 4. COMANDI UTILI (Sviluppo Locale)

- Avviare il server di sviluppo:
  ```bash
  npm run dev
  ```
- Costruire per la produzione:
  ```bash
  npm run build
  ```
