import { mock } from "bun:test";

const mockApp = {
    name: '[DEFAULT]',
    options: {},
    auth: () => ({}),
    database: () => ({}),
    firestore: () => ({
        collection: () => ({}),
        doc: () => ({})
    }),
    messaging: () => ({}),
    storage: () => ({})
};

mock.module("firebase-admin", () => {
    return {
        apps: [mockApp],
        initializeApp: () => mockApp,
        auth: () => ({}),
        firestore: () => ({
            collection: () => ({}),
            doc: () => ({})
        }),
        storage: () => ({}),
        credential: {
            cert: () => ({})
        }
    };
});

mock.module("firebase-admin/firestore", () => {
    return {
        FieldValue: {
            serverTimestamp: () => ({})
        }
    }
});
