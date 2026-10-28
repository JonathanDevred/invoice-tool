import type {Metadata} from 'next';
import {SITE_URL,APP_DESCRIPTION} from '@/lib/seo';
import './globals.css';
export const metadata:Metadata={
 metadataBase:new URL(SITE_URL),
 title:{default:'Free Invoice Generator & Client Workspace | GetPaidFast',template:'%s | GetPaidFast'},
 description:APP_DESCRIPTION,
 alternates:{canonical:'/'},
 applicationName:'GetPaidFast',
 openGraph:{type:'website',locale:'en_US',siteName:'GetPaidFast',title:'Professional invoicing. Without the overhead.',description:APP_DESCRIPTION,url:SITE_URL},
 twitter:{card:'summary_large_image',title:'GetPaidFast — Professional invoicing workspace',description:APP_DESCRIPTION},
 robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
