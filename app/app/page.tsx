import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/supabase/server';
import WorkspaceApp from '../workspace';
export const dynamic='force-dynamic';
export default async function AppPage(){const user=await currentUser();if(!user)redirect('/login');return <WorkspaceApp userId={user.id} email={user.email}/>;}
