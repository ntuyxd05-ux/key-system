// pages/_app.js
import "../styles/globals.css";  // pakai relative path

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
