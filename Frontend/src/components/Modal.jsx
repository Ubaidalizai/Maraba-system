import { AiOutlineClose } from "react-icons/ai";
import React, {
  cloneElement,
  createContext,
  useContext,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FaXmark } from "react-icons/fa6";
import { useClickOutSide } from "../hooks/useClickOutSide";
import { AnimatePresence, motion } from "framer-motion";
const ModalContext = createContext();
export default function Modal({ children }) {
  const [openId, setOpenId] = useState("");
  const open = setOpenId;
  const close = () => setOpenId("");
  return (
    <ModalContext.Provider value={{ openId, open, close }}>
      {children}
    </ModalContext.Provider>
  );
}
function Toggle({ children, id }) {
  const { open, close, openId } = useContext(ModalContext);
  const handleClick = () => {
    openId === "" || openId !== id ? open(id) : close();
  };
  return cloneElement(children, { onClick: (e) => handleClick(e) });
}

function Window({ children, name }) {
  const { openId, close } = useContext(ModalContext);
  const ref = useClickOutSide(close);

  return createPortal(
    <AnimatePresence>
      {openId === name && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.23 }}
          className=" w-full   bg-black/20 h-screen  mx-auto   fixed inset-0 z-50 grid place-items-center  cursor-pointer"
        >
          <div className=" w-auto h-auto relative p-2" ref={ref}>
            <AiOutlineClose
              className=" absolute top-6 right-6"
              onClick={close}
            />
            {React.isValidElement(children)
              ? React.cloneElement(children, {
                  close,
                  onSubmit: (e) => {
                    try {
                      if (typeof children.props.onSubmit === "function") {
                        children.props.onSubmit(e);
                      }
                    } finally {
                      // close after submit handler runs
                      close();
                    }
                  },
                })
              : children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

Modal.Toggle = Toggle;
Modal.Window = Window;
