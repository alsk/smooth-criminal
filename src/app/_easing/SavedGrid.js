"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, Reorder } from "motion/react";
import CurveThumbnail from "./CurveThumbnail";

export default function SavedGrid({
  saved,
  activeKey,
  onSave,
  onPick,
  onRename,
  onDelete,
  onReorder,
  onExport,
  onImport,
  newlyAddedId,
  onClearNewlyAdded,
}) {
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (newlyAddedId) {
      setEditingId(newlyAddedId);
      onClearNewlyAdded?.();
    }
  }, [newlyAddedId, onClearNewlyAdded]);

  return (
    <div className="savedSection">
      <div className="savedHeader">
        <span className="savedHeaderLabel">
          Saved {saved.length > 0 ? `(${saved.length})` : ""}
        </span>
        <div className="savedHeaderActions">
          {saved.length > 0 && (
            <button type="button" className="pushBtn savedChipBtn" onClick={onExport}>
              <span className="pushFace">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 7.5V1.5M2.5 4 5.5 1 8.5 4M1 9.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                export
              </span>
            </button>
          )}
          <button
            type="button"
            className="pushBtn savedChipBtn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="pushFace">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v6M2.5 4.5 5.5 7.5 8.5 4.5M1 9.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              import
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <Reorder.Group as="div" axis="x" values={saved} onReorder={onReorder} className="presetGrid">
        <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {saved.map((cell) => {
              const key = `saved.${cell.id}`;
              const isActive = key === activeKey;
              const isEditing = editingId === cell.id;
              return (
                <SavedCell
                  key={cell.id}
                  cell={cell}
                  isActive={isActive}
                  isEditing={isEditing}
                  onPick={() => onPick(cell)}
                  onStartEdit={() => setEditingId(cell.id)}
                  onEndEdit={() => setEditingId(null)}
                  onRename={(name) => onRename(cell.id, name)}
                  onDelete={() => {
                    if (isEditing) setEditingId(null);
                    onDelete(cell.id);
                  }}
                />
              );
            })}
          </AnimatePresence>
          <motion.button
            type="button"
            layout
            transition={{ layout: { duration: 0.25, ease: [0.2, 0.7, 0.2, 1] } }}
            className="presetCell savedAddCell"
            onClick={onSave}
          >
            <div className="presetThumb savedAddThumb">
              <img src="/sticks/keeper.png" alt="" className="keeperSticker" />
              <svg className="savedAddPlus" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="presetCellLabel">Save curve</span>
          </motion.button>
        </LayoutGroup>
      </Reorder.Group>
    </div>
  );
}

function SavedCell({
  cell,
  isActive,
  isEditing,
  onPick,
  onStartEdit,
  onEndEdit,
  onRename,
  onDelete,
}) {
  const inputRef = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const cancelTimerRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => () => clearTimeout(cancelTimerRef.current), []);

  const onCellClick = () => {
    if (isEditing || confirming) return;
    onPick();
  };

  const onCellKeyDown = (e) => {
    if (isEditing || confirming) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick();
    }
    if (e.key === "Escape") setConfirming(false);
  };

  const onDeleteClick = (e) => {
    e.stopPropagation();
    if (confirming) {
      onDelete();
    } else {
      setConfirming(true);
      cancelTimerRef.current = setTimeout(() => setConfirming(false), 2500);
    }
  };

  return (
    <Reorder.Item
      value={cell}
      layout
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileTap={{ scale: 0.96 }}
      transition={{
        layout: { duration: 0.25, ease: [0.2, 0.7, 0.2, 1] },
        scale: { duration: 0.18, ease: [0.2, 0.7, 0.2, 1] },
        opacity: { duration: 0.15 },
      }}
      role="button"
      tabIndex={0}
      onClick={onCellClick}
      onKeyDown={onCellKeyDown}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setConfirming(false); }}
      className={`presetCell savedCell ${isActive ? "presetCellActive" : ""} ${confirming ? "savedCellConfirming" : ""}`}
      style={{ listStyle: "none" }}
    >

      <button
        type="button"
        className={`savedDelete ${confirming ? "savedDeleteConfirming" : ""}`}
        onClick={onDeleteClick}
        aria-label={confirming ? "Confirm delete" : `Delete ${cell.name}`}
      >
        {confirming ? "delete?" : (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>
      <div className="presetThumb">
        <CurveThumbnail anchors={cell.anchors} />
      </div>
      {isEditing ? (
        <input
          ref={inputRef}
          className="savedNameInput"
          defaultValue={cell.name}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v) onRename(v);
            onEndEdit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onEndEdit();
            }
          }}
        />
      ) : (
        <span
          className="presetCellLabel"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          title="Double-click to rename"
        >
          {cell.name}
        </span>
      )}
    </Reorder.Item>
  );
}
