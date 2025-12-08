import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import React from "react";

interface GlassDropdownItem {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface GlassDropdownProps {
  button: React.ReactNode;
  items: GlassDropdownItem[];
}

export default function GlassDropdown({ button, items }: GlassDropdownProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="focus:outline-none">{button}</Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 scale-90 blur-sm"
        enterTo="opacity-100 scale-100 blur-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 scale-100 blur-0"
        leaveTo="opacity-0 scale-90 blur-sm"
      >
        <Menu.Items
          className="
            absolute right-0 mt-3 w-56 origin-top-right z-50
            backdrop-blur-2xl bg-white/20 dark:bg-dark-surface/30
            border border-white/30 dark:border-dark-border
            rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15),_0_4px_12px_rgba(0,0,0,0.08)]
            p-2
          "
        >
          {items.map((item, index) =>
            item.divider ? (
              <div
                key={index}
                className="w-full border-t border-neutral-100 dark:border-white/10 my-2"
              />
            ) : (
              <Menu.Item key={index}>
                {({ active }) => (
                  <button
                    onClick={item.onClick}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl
                      transition-colors
                      ${item.danger
                        ? "text-danger dark:text-[#D72638]"
                        : "text-[#1F1F1F] dark:text-[#FFFFFF]"
                      }
                      ${active
                        ? item.danger
                          ? "bg-[#FFD3D6] dark:bg-[#5A1118]"
                          : "bg-[#E5F7F2] dark:bg-[#00C79A]"
                        : ""
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                )}
              </Menu.Item>
            )
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}