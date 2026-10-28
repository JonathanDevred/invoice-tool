import type {MetadataRoute} from 'next';
import {SITE_URL} from '@/lib/seo';
export default function sitemap():MetadataRoute.Sitemap{return ['','/invoice-generator','/quote-generator','/invoice-templates','/invoicing-for-freelancers','/privacy'].map(path=>({url:SITE_URL+path,lastModified:new Date(),changeFrequency:path===''?'weekly':'monthly',priority:path===''?1:path==='/privacy'?.2:.8}));}
