import { useState, type ReactNode } from 'react';
import useClickOutside from '../hooks/useClickOutside';

interface DropdownItemProps {
    children: ReactNode;
    depth: number;
    onClickCallback: () => void;
}

interface DropdownProps {
    title: string;
    children: ReactNode;
    trigger: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export function DropdownItem({ children, depth, onClickCallback }: DropdownItemProps) {
    const paddingLeft = ["pl-2", "pl-4", "pl-6", "pl-8", "pl-10"][depth] ?? "pl-10";
    return (
        <li
            className={`flex gap-3 ${paddingLeft} pr-2 py-2 cursor-pointer hover:bg-kiwi-light-black opacity-100`}
            onClick={onClickCallback}
        >
            {children}
        </li>
    );
}

export function Dropdown({ title, children, trigger }: DropdownProps) {
    const [show, setShow] = useState(false);
    const dropRef = useClickOutside(() => setShow(false));

    const titleHtml = <h1 className='ml-2 my-2 text-lg font-bold '>{title}</h1>
    const innerHtml = <ul className='max-h-80 overflow-y-scroll kiwi-scrollbar'>{children}</ul>


    return (
        // `flex flex-col` required for the content within the div to fit exactly (otherwise there is some weird formatting)
        <div className='flex flex-col' ref={dropRef} onClick={() => setShow(current => !current)}>
            <>{trigger}</>
            {show && <div
                className='bg-kiwi-dark-black w-1/4 absolute z-10 mt-8 rounded-lg border block border-kiwi-green'
            >
                {titleHtml}{innerHtml}
            </div>}
        </div>
    );
}
