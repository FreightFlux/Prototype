import React from 'react'
import { MdOutlineClose } from "react-icons/md";

const Modal = ({ isOpen, onClose, children }) => {
    return (
        <>
            {isOpen &&
                <div className='fixed inset-0 flex items-center justify-center z-30'>
                    <div className='fixed inset-0 bg-black opacity-90 transition-opacity duration-75'></div>
                    <div className='absolute w-[35rem] top-[10rem] left-[30rem] py-3 bg-white rounded-xl'>
                        <button onClick={onClose} className='absolute right-6 rounded-full hover:animate-spin p-1'>
                            <MdOutlineClose className='text-[#046a51a1]' size={26} />
                        </button>
                        <div className='py-[2rem] px-8 mt-6 bg-white'>

                            <div className='flex flex-col items-center justify-start gap-10 w-full'>
                                {children}
                            </div>

                        </div>

                    </div>
                </div>
            }
        </>

    )
}

export default Modal
