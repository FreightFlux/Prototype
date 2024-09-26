import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/helper/supabaseClient'; // Your Supabase instance
import { useNavigate } from 'react-router-dom';
import { FaGithub, FaGoogle } from 'react-icons/fa'; // Import icons from react-icons

const AuthForm = () => {
    const [variant, setVariant] = useState('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            username: "",
            email: "",
            password: ""
        }
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setError(null);

        try {
            if (variant === 'REGISTER') {
                const { error: signUpError } = await supabase.auth.signUp({
                    email: data.email,
                    password: data.password,
                    options: { data: { username: data.username } }
                });
                if (signUpError) throw signUpError;

                // Wait for the user session
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                const user = sessionData.session?.user;

                if (user) {
                    // Insert user into 'users' table
                    const { error: insertError } = await supabase
                        .from('users')
                        .upsert([{ id: user.id, email: data.email, username: data.username }]);

                    if (insertError) throw insertError;

                    // Debug: Check if the user was inserted
                    const { data: insertedUser, error: checkError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (checkError) throw checkError;
                    console.log("Inserted user:", insertedUser);

                    // Fetch user role
                    const { data: userData, error: roleError } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    if (roleError) throw roleError;

                    navigateBasedOnRole(userData?.role);
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password
                });
                if (signInError) throw signInError;

                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                const user = sessionData.session?.user;

                if (user) {
                    const { data: userData, error: roleError } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    if (roleError) throw roleError;

                    navigateBasedOnRole(userData?.role);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthSignIn = async (provider) => {
        setLoading(true);
        setError(null);

        try {
            const { error: oAuthError } = await supabase.auth.signInWithOAuth({ provider });
            if (oAuthError) throw oAuthError;

            // Wait and check for the session
            let sessionData = null;
            for (let i = 0; i < 10; i++) {
                sessionData = await supabase.auth.getSession();
                if (sessionData.data.session) break;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            }

            const user = sessionData?.data.session?.user;

            if (user) {
                const { data: existingUser, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (userError) throw userError;

                if (!existingUser) {
                    const { error: insertError } = await supabase
                        .from('users')
                        .upsert([{ id: user.id, email: user.email, username: user.user_metadata.full_name || user.email }]);

                    if (insertError) throw insertError;
                }

                // Debug: Check if the user was inserted
                const { data: insertedUser, error: checkError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (checkError) throw checkError;
                console.log("Inserted user after OAuth:", insertedUser);

                const { data: updatedUser, error: fetchError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (fetchError) throw fetchError;
                if (updatedUser) {
                    setSuccess(true);
                }
                // navigateBasedOnRole(updatedUser?.role);
                if (success) {
                    navigate('/');
                }
            } else {
                throw new Error("User session not found");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // const navigateBasedOnRole = (role) => {
    //     if (role === 'driver') {
    //         navigate('/driver');
    //     } else if (role === 'client') {
    //         navigate('/client');
    //     } else if (role === 'admin') {
    //         navigate('/admin');
    //     } else {
    //         navigate('/');
    //     }
    // };

    return (
        <div className='w-full bg-white p-6 rounded-lg shadow-md'>
            <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col space-y-6' noValidate>
                {variant === "REGISTER" && (
                    <div className='flex flex-col space-y-2'>
                        <input
                            className='w-full rounded-lg px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#046a51] bg-white'
                            id='username'
                            type='text'
                            placeholder='Username'
                            disabled={loading}
                            {...register("username", { required: "Username is required" })}
                        />
                        {errors.username && <p className="text-red-600 text-sm">{errors.username.message}</p>}
                    </div>
                )}
                <div className='flex flex-col space-y-2'>
                    <input
                        className='w-full rounded-lg px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#046a51] bg-white'
                        type='email'
                        id='email'
                        placeholder='Email'
                        disabled={loading}
                        {...register("email", { required: 'Email is required' })}
                    />
                    {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
                </div>
                <div className='flex flex-col space-y-2'>
                    <input
                        className='w-full rounded-lg px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#046a51] bg-white'
                        type='password'
                        id='password'
                        placeholder='Password'
                        disabled={loading}
                        {...register("password", { required: 'Password is required' })}
                    />
                    {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
                </div>
                <button
                    type='submit'
                    className='bg-[#046A51] font-bold hover:bg-[#034d42] rounded-lg text-white px-4 py-2'
                    disabled={loading}
                >
                    {variant === "LOGIN" ? "Login" : "Register"}
                </button>
                {error && <p className='text-red-600 text-sm'>{error}</p>}
            </form>

            <div className='flex items-center justify-center mt-4 gap-2'>
                <p className='font-medium text-gray-400 text-sm'>
                    {variant === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
                </p>
                <p className='text-[#046a51] font-medium cursor-pointer' onClick={() => setVariant(variant === 'LOGIN' ? 'REGISTER' : 'LOGIN')}>
                    {variant === 'LOGIN' ? "Register" : "Login"}
                </p>
            </div>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500">Or continue with</span>
                    </div>
                </div>
            </div>

            <div className='flex justify-center mt-4 gap-4'>
                <button
                    onClick={() => handleOAuthSignIn('github')}
                    className='bg-gray-700 text-white rounded-full p-2 flex items-center justify-center'
                    disabled={loading}
                >
                    <FaGithub size={24} />
                </button>
                <button
                    onClick={() => handleOAuthSignIn('google')}
                    className='bg-red-500 text-white rounded-full p-2 flex items-center justify-center'
                    disabled={loading}
                >
                    <FaGoogle size={24} />
                </button>
            </div>
        </div>
    );
};

export default AuthForm;
