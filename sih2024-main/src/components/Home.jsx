import React, { useEffect } from 'react'
import { supabase } from '../lib/helper/supabaseClient'; // Your supabase instance
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                // Fetch user role
                const { data: userData, error: roleError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (roleError) {
                    console.error(roleError);
                    return;
                }
                // console.log(userData);
                // Redirect based on user role
                if (userData?.role === 'driver') {
                    navigate('/driver');
                } else if (userData?.role === 'client') {
                    navigate('/client');
                } else if (userData?.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            }
        };

        checkSession();
    }, []);

    return (
        <div className='max-w-[1300px] mx-auto py-10'>
            <div className='flex items-end justify-between'>
                <h1 className='font-bold text-[8.5vw] leading-[7rem] '>Leading the way</h1>
                <p className='text-sm font-bold w-[12rem]'>Establishing new standards in eco-friendly and efficient transportation worldwide</p>
            </div>
            <div className='flex flex-row-reverse items-end justify-between mt-6'>
                <h1 className='font-bold text-[8.4vw] leading-[7rem] '>logistics solutions</h1>
                <p className='text-sm font-bold w-[12rem]'>Establishing new standards in eco-friendly and efficient transportation worldwide</p>
            </div>
            <img className='mt-16 w-full h-[34rem] rounded-lg' src="/img/truck-img.png" alt="truck" />

        </div>
    )
}

export default Home
