import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/supabase/server';
import AuthForm from '../auth-form';
export const dynamic='force-dynamic';
export default async function ResetPage(){if(!await currentUser())redirect('/forgot-password');return <AuthForm mode="reset"/>;}
