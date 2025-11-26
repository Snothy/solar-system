import { openDB, type DBSchema } from 'idb';

interface TextureDB extends DBSchema {
  textures: {
    key: string;
    value: {
      name: string;
      blob: Blob;
      timestamp: number;
    };
  };
  selections: {
    key: string;
    value: {
      bodyName: string;
      textureId: string; // 'default' or custom texture name
    };
  };
}

const DB_NAME = 'SolarSystemTextures';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB<TextureDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('textures')) {
        db.createObjectStore('textures', { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains('selections')) {
        db.createObjectStore('selections', { keyPath: 'bodyName' });
      }
    },
  });
};

export const saveTexture = async (name: string, blob: Blob) => {
  const db = await initDB();
  await db.put('textures', {
    name,
    blob,
    timestamp: Date.now(),
  });
};

export const getTexture = async (name: string) => {
  const db = await initDB();
  return db.get('textures', name);
};

export const getAllTextures = async () => {
  const db = await initDB();
  return db.getAll('textures');
};

export const saveTextureSelection = async (bodyName: string, textureId: string) => {
  const db = await initDB();
  await db.put('selections', {
    bodyName,
    textureId,
  });
};

export const getTextureSelection = async (bodyName: string) => {
  const db = await initDB();
  return db.get('selections', bodyName);
};

export const deleteTexture = async (name: string) => {
  const db = await initDB();
  await db.delete('textures', name);
};

export const deleteTextureSelection = async (bodyName: string) => {
  const db = await initDB();
  await db.delete('selections', bodyName);
};

export const getAllTextureSelections = async () => {
  const db = await initDB();
  return db.getAll('selections');
};
