import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    playlists: string[]; // Array of Playlist IDs
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    playlists: [{ type: Schema.Types.ObjectId, ref: 'Playlist' }]
});

const User = mongoose.model<IUser>('User', UserSchema);

export default User;