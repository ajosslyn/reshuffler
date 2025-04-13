import mongoose, { Schema, Document } from 'mongoose';

interface ITrack {
    id: any;
    name: any;
    album: any;
    title: string;
    artist: string;
    genre: string;
    tempo: number;
    language: string;
}

export interface IPlaylist extends Document {
    name: string;
    description: string;
    tracks: ITrack[];
    createdAt: Date;
    updatedAt: Date;
}

const TrackSchema: Schema = new Schema({
    title: { type: String, required: true },
    artist: { type: String, required: true },
    genre: { type: String, required: true },
    tempo: { type: Number, required: true },
    language: { type: String, required: true },
});

const PlaylistSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    tracks: { type: [TrackSchema], default: [] },
}, {
    timestamps: true,
});

const Playlist = mongoose.model<IPlaylist>('Playlist', PlaylistSchema);

export default Playlist;