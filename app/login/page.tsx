import AuthForm from '../auth-form';
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}){const {error}=await searchParams;return <AuthForm mode="login" initialError={error?error==='confirmation'?'The sign-in link could not be verified. Please try Google sign-in again.':'Sign-in is temporarily unavailable. Please try again shortly.':''}/>;}
