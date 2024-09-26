import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FaPlus, FaTrash } from "react-icons/fa6";
import { supabase } from '../lib/helper/supabaseClient'; // Ensure supabase is properly imported

const StartJourney = ({ truckId }) => {
    const [loading, setLoading] = useState(false);
    const [journeys, setJourneys] = useState([{ JourneyPoints: "", OnLoading: "", OffLoading: "" }]);
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            TruckNumber: truckId,
        }
    });

    const [truck, setTruck] = useState(null);

    // Fetch truck details on mount
    useEffect(() => {
        const fetchTruckData = async () => {
            const { data: truckData, error } = await supabase
                .from('trucks')
                .select('*')
                .eq('id', truckId)
                .single();

            if (error) {
                console.error("Error fetching truck data:", error);
            } else {
                // Initialize current_capacity if it's null
                if (truckData.current_capacity === null) {
                    truckData.current_capacity = 100;
                }
                if (!Array.isArray(truckData.locations)) {
                    truckData.locations = [];
                }
    
                setTruck(truckData);
            }
        };

        fetchTruckData();
    }, [truckId]);

    const onSubmit = async (data) => {
        if (!truck) {
            console.error("Truck data not available");
            return;
        }
    
        setLoading(true);
        let currentCapacity = truck.current_capacity;
    
        // Start with the existing locations or an empty array if locations are null/undefined
        const updatedLocations = truck.locations ? [...truck.locations] : [];
    
        // Process each journey point
        for (const journey of journeys) {
            const onLoad = parseInt(journey.OnLoading || "0");
            const offLoad = parseInt(journey.OffLoading || "0");
    
            // Ensure the truck capacity doesn't exceed its stock capacity or drop below 0
            const newCapacity = currentCapacity + offLoad - onLoad;
            if (newCapacity > 100 || newCapacity < 0) {
                alert(`Invalid capacity: Truck cannot exceed 100 or go below 0.`);
                setLoading(false);
                return;
            }
    
            // Update current capacity
            currentCapacity = newCapacity;
    
            // Add journey to the locations JSONB field
            updatedLocations.push({
                place: journey.JourneyPoints,
                loaded: onLoad,
                unloaded: offLoad,
                currentCapacity: currentCapacity
            });
        }
    
        console.log("Updated Truck Data:", { currentCapacity, updatedLocations });
    
        // Update truck data in the database with merged locations
        const { error } = await supabase
            .from('trucks')
            .update({ current_capacity: currentCapacity, locations: updatedLocations, stock_capacity: 100 - currentCapacity })
            .eq('id', truckId);
    
        if (error) {
            console.error("Error updating truck data:", error);
        } else {
            console.log("Truck data updated successfully");
        }
    
        setLoading(false);
    };
    

    const addJourneyRow = () => {
        setJourneys([...journeys, { JourneyPoints: "", OnLoading: "", OffLoading: "" }]);
    };

    const removeJourneyRow = (index) => {
        const newJourneys = journeys.filter((_, idx) => idx !== index);
        setJourneys(newJourneys);
    };

    const handleJourneyChange = (index, field, value) => {
        const newJourneys = journeys.map((journey, idx) => {
            if (idx === index) {
                return { ...journey, [field]: value };
            }
            return journey;
        });
        setJourneys(newJourneys);
    };

    return (
        <div className='w-full bg-white'>
            <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col space-y-6'>
                <div className='flex flex-col justify-center items-start gap-4'>
                    <label htmlFor="truck-id" className='text-[#046a51] font-bold text-2xl'>Truck Number</label>
                    <input className='w-full rounded-lg px-4 py-2 focus:outline-none bg-white shadow-md shadow-slate-200 hover:ring-1 hover:ring-[#046a51a1]'
                        id='truck-id'
                        type='text'
                        disabled={loading}
                        {...register("TruckNumber")}
                    />
                </div>

                {journeys.map((journey, index) => (
                    <div key={index} className='flex items-center justify-center gap-4'>
                        <input
                            className='w-full rounded-lg px-4 py-2 focus:outline-none bg-white shadow-md shadow-slate-200 hover:ring-1 hover:ring-[#046a51a1]'
                            type='text'
                            id={`journeyPts-${index}`}
                            placeholder='Journey points'
                            disabled={loading}
                            value={journey.JourneyPoints}
                            onChange={(e) => handleJourneyChange(index, 'JourneyPoints', e.target.value)}
                        />

                        <input
                            className='w-full rounded-lg px-4 py-2 focus:outline-none bg-white shadow-md shadow-slate-200 hover:ring-1 hover:ring-[#046a51a1]'
                            type='number'
                            id={`onloading-${index}`}
                            placeholder='On Loading'
                            disabled={loading}
                            value={journey.OnLoading}
                            onChange={(e) => handleJourneyChange(index, 'OnLoading', e.target.value)}
                        />

                        <input
                            className='w-full rounded-lg px-4 py-2 focus:outline-none bg-white shadow-md shadow-slate-200 hover:ring-1 hover:ring-[#046a51a1]'
                            type='number'
                            id={`offloading-${index}`}
                            placeholder='Off Loading'
                            disabled={loading}
                            value={journey.OffLoading}
                            onChange={(e) => handleJourneyChange(index, 'OffLoading', e.target.value)}
                        />

                        <button
                            type='button'
                            className='p-2 text-red-500 hover:text-red-700'
                            onClick={() => removeJourneyRow(index)}
                        >
                            <FaTrash />
                        </button>
                    </div>
                ))}

                <button type='button' className='flex items-center justify-center gap-4 p-2 ring-1 ring-[#046a51] rounded-full text-white' onClick={addJourneyRow}>
                    <FaPlus className='text-[#046a51]' />
                    <p className='text-[#046a51]'>Add Destination</p>
                </button>

                <button type='submit' className='bg-[#046A51] font-bold hover:bg-[#046a51a1] rounded-lg text-white px-4 py-2'>
                    Submit
                </button>
            </form>
        </div>
    );
};

export default StartJourney;
