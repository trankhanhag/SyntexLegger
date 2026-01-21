import React from 'react';

type FormModalProps = {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    icon?: string;
    sizeClass?: string;
    panelClass?: string;
    bodyClass?: string;
    onBackdropClick?: () => void;
};

export const FormModal = ({
    title,
    onClose,
    children,
    icon,
    sizeClass = 'max-w-4xl',
    panelClass = '',
    bodyClass = '',
    onBackdropClick
}: FormModalProps) => {
    const size = sizeClass && sizeClass.trim().length > 0 ? sizeClass : 'max-w-4xl';
    const panel = `${size} ${panelClass}`.trim();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onBackdropClick}>
            <div className={`form-modal w-full ${panel}`} onClick={(event) => event.stopPropagation()}>
                <div className="form-modal__header">
                    <h3 className="form-modal__title">
                        {icon && <span className="material-symbols-outlined form-modal__icon">{icon}</span>}
                        {title}
                    </h3>
                    <button onClick={onClose} className="form-modal__close" aria-label="Close">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className={`form-modal__body ${bodyClass}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
