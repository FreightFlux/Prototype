import React, { useEffect, useState } from 'react';
import { FaLocationArrow } from 'react-icons/fa6';
import Modal from './Modal';
import AuthForm from './AuthForm';
import { supabase } from '../lib/helper/supabaseClient';
import { useNavigate } from 'react-router-dom';
const Navbar = () => {
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [authenticated, setAuthenticated] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setAuthenticated(true);
                setSession(session);
                setUser(session?.user?.user_metadata?.name);

                // Check if the user exists in the 'users' table
                const { data: existingUser, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (userError) {
                    console.error('Error checking user existence:', userError);
                }

                // If the user does not exist, insert them into the 'users' table
                if (!existingUser) {
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert([{ id: session.user.id, email: session.user.email, username: session.user.user_metadata?.name || session.user.email }]);

                    if (insertError) {
                        console.error('Error inserting user:', insertError);
                    }
                }
            }
        };

        checkSession();
    }, []);

    const close = () => {
        setOpen(!open);
    };

    // Logout and clear the session
    const handleLogout = async () => {
        await supabase.auth.signOut(); // This will remove the session from local storage
        setAuthenticated(false); // Set authenticated state to false
        setUser(null); // Reset the user state
        setSession(null); // Clear the session state
        navigate('/');
    };

    return (
        <div className='max-w-[1300px] mx-auto py-[1.2rem] flex items-center justify-between'>
            {/* <p className='font-bold text-[#046A51] text-[2rem]'>LOGO</p> */}
            <div className='flex items-center justify-start gap-16'>
                <img src="/images/Fluxfreight-logo.png" alt="ff-logo" className='w-[6rem] h-[6rem]' />
                <ul className='flex items-center justify-center gap-10'>
                    <li className='text-lg font-semibold text-gray-400'>Home</li>
                    <li className='text-lg font-semibold text-gray-400'>Start</li>
                    <li className='text-lg font-semibold text-gray-400'>Tracking</li>
                    <li className='text-lg font-semibold text-gray-400'>Notification</li>
                </ul>
            </div>

            {!authenticated ? (
                <button onClick={close} className='relative flex items-center justify-center'>
                    <div className='py-3 px-8 rounded-full bg-[#046A51] text-sm text-white font-medium'>Login</div>
                    <div className='absolute left-[5.8rem] rounded-full bg-[#046A51] p-3'>
                        <FaLocationArrow className='text-white' />
                    </div>
                </button>
            ) : (
                <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold text-gray-600">Welcome, {user}</p>
                    <button onClick={handleLogout} className='py-3 px-8 rounded-full bg-red-500 text-sm text-white font-medium'>
                        Logout
                    </button>
                </div>
            )}

            <Modal isOpen={open} onClose={close}>
                <AuthForm />
            </Modal>
        </div>
    );
}

export default Navbar;
