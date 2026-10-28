import type {MetadataRoute} from 'next';
import {SITE_URL} from '@/lib/seo';
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:'*',allow:'/',disallow:['/app','/api/','/auth/','/demo','/login','/signup','/forgot-password','/reset-password']}],sitemap:`${SITE_URL}/sitemap.xml`,host:SITE_URL};}
