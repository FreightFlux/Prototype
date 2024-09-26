import React, { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import StartJourney from '../components/StartJourney';
import { supabase } from '../lib/helper/supabaseClient';
import { IoMdAdd } from "react-icons/io";
import { FaTrash } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [open, setOpen] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [allusers, setAllusers] = useState([]);
  const [alltrucks, setAlltrucks] = useState([]);
  const [truckId, setTruckId] = useState(null);
  const navigate = useNavigate();

  const close = (truckId) => {
    setTruckId(truckId);
    setOpen(!open);
  };

  useEffect(() => {
    const fetchAllUsers = async () => {
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'driver');

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setAllusers(allUsers);
      }
    };

    const fetchAllTrucks = async () => {
      const { data: allTrucks, error } = await supabase.from('trucks').select(`
        id, 
        driver_id, 
        users(username)
      `);

      if (error) {
        console.error("Error fetching trucks:", error);
      } else {
        setAlltrucks(allTrucks);
      }
    };

    fetchAllUsers();
    fetchAllTrucks();
  }, []);  // Empty dependency array to run effect only once on mount

  const assignTruck = async (userId) => {
    const { error } = await supabase
      .from('trucks')
      .insert([{ driver_id: userId }]);

    if (error) {
      console.error("Error assigning truck:", error);
    } else {
      console.log(`Truck assigned to user with ID: ${userId}`);
      setAddSuccess(true);
    }
  };

  const unassignTruck = async (userId) => {
    const { error } = await supabase
      .from('trucks')
      .delete()
      .eq('driver_id', userId);

    if (error) {
      console.error("Error unassigning truck:", error);
    } else {
      console.log(`Truck unassigned from user with ID: ${userId}`);
    }
  };

  return (
    <div className='max-w-[1300px] mx-auto py-10'>
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 text-left py-2">ID</th>
            <th className="border px-4 text-left py-2">Name</th>
            <th className="border px-4 text-left py-2">Email</th>
            <th className="border px-4 text-left py-2">Assign</th>
            <th className="border px-4 text-left py-2">Unassign</th>
          </tr>
        </thead>
        <tbody>
          {allusers.length > 0 ? (
            allusers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-100">
                <td className="border px-4 py-2">{user.id}</td>
                <td className="border px-4 py-2">{user.username}</td>
                <td className="border px-4 py-2">{user.email}</td>
                <td className='border px-4 text-center py-2'>
                  <div
                    onClick={() => assignTruck(user.id)}
                    className='cursor-pointer flex items-center justify-center gap-2 px-1 py-2 rounded-sm bg-zinc-200'
                  >
                    <IoMdAdd />
                    <p>Add</p>
                  </div>
                </td>
                <td className='border px-12 text-center py-2'>
                  <FaTrash size={20} onClick={() => unassignTruck(user.id)} className='cursor-pointer text-red-600' />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center py-4">No users found</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className='flex flex-col items-center justify-center gap-8 mt-9'>
        {alltrucks.map((truck) => (

          <div key={truck.id}
            onClick={() => close(truck.id)}  // Wrap in an anonymous function
            className='cursor-pointer rounded-xl bg-[#046A51] flex items-center justify-between gap-5 px-10 py-4 text-white w-full'
          >
            <p>#{truck.id}</p>
            <p className='font-bold text-2xl'>{truck.users?.username}</p>
            <div onClick={() => navigate(`/admin/map/${truck.id}`)} className='cursor-pinter'><FaLocationDot size={30} className='text-red-500 animate-bounce' /></div>
          </div>


        ))}
      </div>

      {/* Modal with StartJourney component */}
      <Modal isOpen={open} onClose={() => setOpen(false)} >
        <StartJourney truckId={truckId} />
      </Modal>
    </div>
  );
};

export default Dashboard;
