const Note = require("../models/Note");

/**
 * Checks if notes already exist for this exact topic + source file.
 * Returns the cached note if found, otherwise null.
 */
async function findCachedNote(sourceFileName, topicName) {
  return await Note.findOne({ sourceFileName, topicName });
}

/**
 * Saves newly-generated notes to the database, so future requests
 * for the same topic don't need to call Gemini again.
 */
async function saveNote(sourceFileName, topicName, rawText, generatedNotes) {
  const note = new Note({
    sourceFileName,
    topicName,
    rawText,
    generatedNotes,
  });
  return await note.save();
}

module.exports = { findCachedNote, saveNote };
