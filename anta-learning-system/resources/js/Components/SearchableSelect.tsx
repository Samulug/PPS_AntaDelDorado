import React, {
    useState,
    useRef,
    useEffect,
    useLayoutEffect,
    useMemo,
    useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    description?: string; // Segunda línea opcional (ej. rol, turno, nodo)
    keywords?: string;    // Texto extra buscable (ej. DNI, email, legajo)
    disabled?: boolean;
}

interface SearchableSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    maxVisibleOptions?: number;
    minDropdownWidth?: number;
    searchable?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    name?: string;
    ariaLabel?: string;
    className?: string;
}

const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const normalizeText = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'No se encontraron resultados.',
    maxVisibleOptions = 5,
    minDropdownWidth = 220,
    searchable = true,
    clearable = false,
    disabled = false,
    required = false,
    id,
    name,
    ariaLabel,
    className = '',
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);

    const isPortalReady = isOpen && dropdownStyle !== null;

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const hasDescriptions = useMemo(
        () => options.some((opt) => Boolean(opt.description)),
        [options]
    );

    // Altura fija por ítem (+8px por py-1 del ul) para mostrar exactamente N opciones sin recortar la última
    const itemHeight = hasDescriptions ? 54 : 40;
    const listMaxHeight = maxVisibleOptions * itemHeight + 8;

    const selectedOption = useMemo(
        () => options.find((opt) => opt.value === value) || null,
        [options, value]
    );

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const q = normalizeText(search);
        return options.filter((opt) => {
            const haystack = normalizeText(
                `${opt.label} ${opt.description || ''} ${opt.keywords || ''}`
            );
            return haystack.includes(q);
        });
    }, [options, search]);

    const closeDropdown = useCallback(() => {
        setIsOpen(false);
        setSearch('');
        setDropdownStyle(null);
    }, []);

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();

        // Si el botón disparador salió completamente de la pantalla al scrollear, cierra el menú
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
            closeDropdown();
            return;
        }

        const searchBarHeight = searchable ? 50 : 0;
        const visibleCount = Math.max(1, Math.min(filteredOptions.length, maxVisibleOptions));
        const estimatedHeight = searchBarHeight + visibleCount * itemHeight + 16;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

        // Ancho mínimo cómodo para barras compactas (ej. Colaboradores), sin desbordar la pantalla
        const maxViewportWidth = Math.max(160, window.innerWidth - 16);
        const dropdownWidth = Math.min(
            Math.max(rect.width, minDropdownWidth),
            maxViewportWidth
        );
        const clampedLeft = Math.max(
            8,
            Math.min(rect.left, window.innerWidth - dropdownWidth - 8)
        );

        setDropdownStyle({
            position: 'fixed',
            left: clampedLeft,
            width: dropdownWidth,
            zIndex: 9999,
            ...(openUpwards
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
        });
    }, [
        closeDropdown,
        filteredOptions.length,
        itemHeight,
        maxVisibleOptions,
        minDropdownWidth,
        searchable,
    ]);

    const handleSelect = useCallback(
        (option: SelectOption) => {
            if (option.disabled) return;
            onChange(option.value);
            closeDropdown();
            triggerRef.current?.focus({ preventScroll: true });
        },
        [onChange, closeDropdown]
    );

    // Calcula coordenadas antes del pintado para evitar cualquier salto de scroll
    useIsomorphicLayoutEffect(() => {
        if (!isOpen) return;

        updatePosition();

        const handleResize = () => updatePosition();
        const handleScroll = (e: Event) => {
            // Ignora el scroll interno de la lista desplegable
            if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
                return;
            }
            updatePosition();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen, updatePosition]);

    // Enfoca el buscador una sola vez al quedar posicionado el portal, sin mover la ventana
    useEffect(() => {
        if (!isPortalReady || !searchable) return;
        searchInputRef.current?.focus({ preventScroll: true });
    }, [isPortalReady, searchable]);

    // Cierra al hacer clic fuera del disparador y del menú
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                dropdownRef.current?.contains(target)
            ) {
                return;
            }
            closeDropdown();
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, closeDropdown]);

    // Reinicia el ítem resaltado al abrir o cambiar la búsqueda
    useEffect(() => {
        if (!isOpen) return;
        const selectedIdx = filteredOptions.findIndex(
            (o) => o.value === value && !o.disabled
        );
        if (selectedIdx >= 0) {
            setHighlightedIndex(selectedIdx);
        } else {
            setHighlightedIndex(filteredOptions.findIndex((o) => !o.disabled));
        }
    }, [search, isOpen, filteredOptions, value]);

    // Mantiene visible la opción resaltada moviendo solo el scroll interno del <ul>
    useEffect(() => {
        if (!isPortalReady || !listRef.current || highlightedIndex < 0) return;

        const list = listRef.current;
        const activeEl = list.children[highlightedIndex] as HTMLElement | undefined;
        if (!activeEl) return;

        const elTop = activeEl.offsetTop;
        const elBottom = elTop + activeEl.offsetHeight;

        if (elTop < list.scrollTop) {
            list.scrollTop = elTop;
        } else if (elBottom > list.scrollTop + list.clientHeight) {
            list.scrollTop = elBottom - list.clientHeight;
        }
    }, [highlightedIndex, isPortalReady]);

    const getNextEnabledIndex = (startIndex: number, direction: 1 | -1) => {
        const len = filteredOptions.length;
        if (len === 0) return -1;
        for (let i = 1; i <= len; i++) {
            const next = (startIndex + direction * i + len) % len;
            if (!filteredOptions[next].disabled) return next;
        }
        return -1;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            closeDropdown();
            triggerRef.current?.focus({ preventScroll: true });
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => getNextEnabledIndex(prev, 1));
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                getNextEnabledIndex(prev < 0 ? 0 : prev, -1)
            );
            return;
        }

        if (e.key === 'Enter') {
            // Evita enviar el <form> padre al confirmar una opción con Enter
            e.preventDefault();
            const target = filteredOptions[highlightedIndex];
            if (target && !target.disabled) {
                handleSelect(target);
            }
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        closeDropdown();
        triggerRef.current?.focus({ preventScroll: true });
    };

    return (
        <div className={`relative w-full min-w-0 ${className}`}>
            {/* Input oculto para mantener validación HTML5 (required) dentro de formularios */}
            {required && (
                <input
                    type="text"
                    name={name}
                    value={value}
                    required
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={() => {}}
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                />
            )}

            {/* Botón disparador alineado a min-h-[38px] con el resto de filtros y botones */}
            <button
                ref={triggerRef}
                id={id}
                type="button"
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => {
                    if (disabled) return;
                    if (isOpen) {
                        closeDropdown();
                    } else {
                        setIsOpen(true);
                    }
                }}
                onKeyDown={handleKeyDown}
                className={`w-full min-w-0 min-h-[38px] flex items-center justify-between gap-2 px-3 py-[7px] rounded-[8px] border text-left text-[13.5px] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isOpen
                        ? 'border-[#2F6F5E] ring-2 ring-[#2F6F5E]/15 bg-white dark:bg-[#141714]'
                        : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] hover:border-[#D1D5DB] dark:hover:border-[#3A423C]'
                }`}
            >
                <span
                    className={`truncate ${
                        selectedOption
                            ? 'text-[#1F2328] dark:text-[#ECEFEC]'
                            : 'text-[#6B7280] dark:text-[#9AA39D]'
                    }`}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <span className="flex items-center gap-1 shrink-0 text-[#6B7280] dark:text-[#9AA39D]">
                    {clearable && value && !disabled && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleClear}
                            aria-label="Limpiar selección"
                            className="p-0.5 rounded hover:bg-[#F7F7F6] dark:hover:bg-[#222723] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-150 ${
                            isOpen ? 'rotate-180 text-[#2F6F5E] dark:text-[#6FBFA5]' : ''
                        }`}
                    />
                </span>
            </button>

            {/* Menú desplegable renderizado en Portal solo cuando las coordenadas están listas */}
            {isPortalReady &&
                dropdownStyle &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={dropdownStyle}
                        onKeyDown={handleKeyDown}
                        className="rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] shadow-lg overflow-hidden"
                    >
                        {/* Buscador interno */}
                        {searchable && (
                            <div className="p-2 border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/70">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="w-full pl-8 pr-7 py-1.5 rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] text-[#1F2328] dark:text-[#ECEFEC] placeholder-[#6B7280] focus:outline-none focus:border-[#2F6F5E]"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                searchInputRef.current?.focus({
                                                    preventScroll: true,
                                                });
                                            }}
                                            aria-label="Borrar búsqueda"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lista scrolleable con tope exacto de N opciones visibles */}
                        <ul
                            ref={listRef}
                            role="listbox"
                            style={{ maxHeight: `${listMaxHeight}px` }}
                            className="relative overflow-y-auto py-1 m-0 list-none"
                        >
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => {
                                    const isSelected = opt.value === value;
                                    const isHighlighted = idx === highlightedIndex;

                                    return (
                                        <li
                                            key={opt.value}
                                            role="option"
                                            aria-selected={isSelected}
                                            aria-disabled={opt.disabled}
                                            onMouseEnter={() =>
                                                !opt.disabled && setHighlightedIndex(idx)
                                            }
                                            onClick={() => handleSelect(opt)}
                                            style={{ minHeight: `${itemHeight}px` }}
                                            className={`px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                                                opt.disabled
                                                    ? 'opacity-45 cursor-not-allowed'
                                                    : 'cursor-pointer'
                                            } ${
                                                isSelected
                                                    ? 'bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                                    : isHighlighted
                                                    ? 'bg-[#F7F7F6] dark:bg-[#141714] text-[#1F2328] dark:text-[#ECEFEC]'
                                                    : 'text-[#1F2328] dark:text-[#ECEFEC]'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <span
                                                    className={`block text-[13.5px] truncate ${
                                                        isSelected ? 'font-semibold' : 'font-normal'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </span>
                                                {opt.description && (
                                                    <span className="block text-[11.5px] text-[#6B7280] dark:text-[#9AA39D] truncate mt-0.5">
                                                        {opt.description}
                                                    </span>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <Check className="w-4 h-4 shrink-0 text-[#2F6F5E] dark:text-[#6FBFA5]" />
                                            )}
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="px-3 py-5 text-center text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                                    {emptyMessage}
                                </li>
                            )}
                        </ul>
                    </div>,
                    document.body
                )}
        </div>
    );
}