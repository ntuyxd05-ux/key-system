// pages/_app.js
import "../styles/globals.css";  // pakai path relatif, BUKAN '@/...'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
