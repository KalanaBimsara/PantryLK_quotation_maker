import './globals.css';

export const metadata = {
  title: 'Pantry LK Pvt Ltd - Quotation Maker',
  description: 'Official Quotation Maker & Component Catalog for Pantry LK Pvt Ltd',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#F6F4EF] text-[#14263D] antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
