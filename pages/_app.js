// pages/_app.js
import "../styles/globals.css";   // ← ganti ini

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
