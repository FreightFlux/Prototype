import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/helper/supabaseClient';

const DriverDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState(null);
  const [truckLoc, setTruckLoc] = useState(null);
  const [truckId, setTruckId] = useState(null);

  // Fetch user session and data from the 'users' table
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError.message);
          throw sessionError;
        }

        if (session) {
          const userId = session.user.id;

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (userError) {
            console.error('Error fetching user data:', userError.message);
            throw userError;
          }

          if (!userData) {
            await supabase.from('users').insert([{ id: session?.user.id, email: session?.user.email, username: session?.user?.user_metadata?.name }]);
            const { data: newUserData, error: newUserError } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();

            setUserDetails(newUserData);
          } else {
            setUserDetails(userData);
          }

          setUser(session.user.aud);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching user data:', error.message);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  // Fetch truck data based on user details
  useEffect(() => {
    if (!userDetails) return; // Only fetch truck data if userDetails is available

    const fetchTruck = async () => {
      try {
        setLoading(true);
        const { data: truck, error } = await supabase
          .from('trucks')
          .select('*')
          .eq('driver_id', userDetails.id)
          .single();

        if (error) {
          throw error;
        }

        setTruckId(truck.id);
        setTruckLoc(truck.locations);
      } catch (error) {
        console.error('Error fetching the truck data:', error.message);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchTruck();
  }, [userDetails, navigate]); // Depend on userDetails

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className='max-w-[1300px] mx-auto mt-10'>
      {user ? (
        <div className=''>
          <p className='text-[#046a5185] text-5xl font-bold'>Welcome, {userDetails.username}</p>
          {truckLoc?.length > 0 &&
            <>
              <div className='flex items-center justify-start gap-2 my-6'>
                <p className='text-black font-bold text-lg'>Journey Updated</p>
                <div className='bg-green-500 rounded-full p-[0.3rem]'></div>
              </div>
              <div className='flex items-end justify-start gap-2'>
                <img src="/images/stop.png" alt="stop" className='w-[4rem]' />
                <div className='border-dotted border-b-4 w-[60%] border-[#046a51]'></div>
                <img src="/images/truck.png" alt="truck-icon" className='w-[6rem]' />
                <p onClick={() => navigate(`/driver/map/${truckId}`)} className='cursor-pointer text-[#046a51] text-lg font-bold ml-10 bg-transparent px-4 py-2 shadow-md shadow-zinc-200 rounded-md'>Start journey</p>
              </div>
            </>
          }
        </div>
      ) : (
        <p>Not Authenticated</p>
      )}
    </div>
  );
};

export default DriverDashboard;
