import "./globals.css";

export const metadata = {
  title: "Camera Celebration Template",
  description: "Fast, event-ready camera booth with celebration overlays.",
}
export const viewport= { 
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
