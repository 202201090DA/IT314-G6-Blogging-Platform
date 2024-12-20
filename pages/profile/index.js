"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where, 
  getDocs, 
  setDoc, 
  deleteDoc,
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../firebase/firebase";
import { auth } from "../../firebase/firebase";
import { Camera } from 'lucide-react'; // Import Camera from react-feather
import Link from 'next/link';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [userBlogs, setUserBlogs] = useState([]);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userDrafts, setUserDrafts] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setCurrentUser(currentUser);
        try {
          // Fetch user data
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(userData);
            setName(userData.name);
            setBio(userData.bio || "");
            setUsername(userData.username);
            setProfileImage(userData.profileImage || "");

            // Fetch blogs by user
            const blogsQuery = query(
              collection(db, "blogs"),
               where("userId", "==", currentUser.uid)
              );
            const blogsSnapshot = await getDocs(blogsQuery);
            const blogsData = blogsSnapshot.docs.map((doc) => ({
               id: doc.id, 
               ...doc.data(),
               }));
            setUserBlogs(blogsData);

            // Fetch drafts by user (new query for drafts)
            const draftsQuery = query(collection(db, 'drafts'), where('userId', '==', currentUser.uid));
            const draftsSnapshot = await getDocs(draftsQuery);
            const draftsData = draftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserDrafts(draftsData);

            // Get follower and following counts from the users table
            setFollowersCount(userData.followersCount || 0);
            setFollowingCount(userData.followingCount || 0);
          } else {
            setError("User document does not exist.");
          }
        } catch (error) {
          setError("Failed to fetch data: " + error.message);
        }
      } else {
        setError("User not authenticated.");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    setImageFile(file);
  };

  const uploadProfileImage = async () => {
    if (!imageFile) return;

    const imageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${imageFile.name}`);

    if (profileImage) {
      const oldImageRef = ref(storage, profileImage);
      await deleteObject(oldImageRef).catch((error) => {
        console.error('Error deleting old image: ', error);
      });
    }

    await uploadBytes(imageRef, imageFile);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  };

  const checkUsernameAvailability = async (newUsername) => {
    try {
      const usernameQuery = query(collection(db, "users"), where("username", "==", newUsername));
      const querySnapshot = await getDocs(usernameQuery);
      return ((user.username===newUsername) || querySnapshot.empty); // Return true if username is available
    } catch (error) {
      console.error("Error checking username availability:", error);
      return false; // In case of error, return false (username might be taken or error occurred)
    }
  };

  const handleSave = async () => {
    try {
      const currentUserUid = auth.currentUser.uid;

      // Check if the new username is available
      const usernameAvailable = await checkUsernameAvailability(username);
      if (!usernameAvailable) {
        setError('Username is already taken.');

        // Clear the error after 3 seconds
        setTimeout(() => {
        setError('');
        }, 3000);
        
        return;
      }

      // Upload profile image if it has changed
      let updatedProfileImage = profileImage;
      if (imageFile) {
        updatedProfileImage = await uploadProfileImage();
      }

      // Update user document
      await updateDoc(doc(db, 'users', currentUserUid), {
        name,
        bio,
        profileImage: updatedProfileImage,
        username, // Update username
      });


      setUser({ ...user, name, bio, profileImage: updatedProfileImage, username });
      setIsEditing(false);
    } catch (error) {
      setError('Failed to update profile: ' + error.message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setName(user.name);
    setBio(user.bio || "");
    setUsername(user.username);
    setImageFile(null); // Reset image file when canceling
  };

  return (
    <div className="min-h-screen bg-blue-200 p-8" style={{ backgroundColor: '#f0f4f8' }}>
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        {user ? (
          <div className="space-y-8">
            {/* Header Section */}
            {!isEditing ? (
  <>
    <div className="flex justify-between items-center mb-6">
      <span className="text-xl text-gray-700 font-normal">@{username}</span>
      <div className="flex items-center space-x-3">
        <button
          onClick={handleEdit}
          className="bg-blue-500 text-white px-4 py-1 rounded-md"
        >
          Edit Profile
        </button>
      </div>
    </div>

    {/* Profile Picture, Name, Bio, and Stats Section */}
    <div className="flex items-start mb-8">
      <div className="flex-shrink-0">
        {profileImage ? (
          <img src={profileImage} alt="Profile" className="w-24 h-24 rounded-full border border-gray-200" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
        <div className="text-center mt-4">
          <span className="text-lg font-normal text-gray-800">{name}</span>
        </div>
        <div className="text-center mt-2 text-gray-500">
          <p>{bio || "............................."}</p>
        </div>
      </div>

      {/* Stats - Centered Inline with Profile Picture */}
      <div className="flex-1 ml-8 flex justify-center items-center">
        <div className="flex space-x-12 text-center">
          <div>
            <div className="text-indigo-500 font-semibold text-lg">{userBlogs.length}</div>
            <div className="text-gray-600 text-sm">Blogs</div>
          </div>
          <div>
            <div className="text-indigo-500 font-semibold text-lg">{followingCount}</div>
            <div className="text-gray-600 text-sm">Following</div>
          </div>
          <div>
            <div className="text-indigo-500 font-semibold text-lg">{followersCount}</div>
            <div className="text-gray-600 text-sm">Followers</div>
          </div>
        </div>
      </div>
    </div>

    {/* Blogs Section */}
    <div className="w-full">
      <h2 className="text-xl font-medium text-gray-700 mb-6">Your Blogs</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {userBlogs.map((blog) => (
          <div key={blog.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">{blog.title}</h3>
            <div className="text-gray-500 text-sm line-clamp-1 mb-6">
              {blog.content || "..................................."}
            </div>
            <div className="text-right">
              <a href={`/blog/${blog.id}`} className="text-indigo-600 text-sm">Read more</a>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Drafts Section */}
    <div className="w-full mt-8">
      <h2 className="text-xl font-medium text-gray-700 mb-6">Your Drafts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {userDrafts.map((draft) => (
            <div key={draft.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">{draft.title}</h3>
                <div className="text-gray-500 text-sm line-clamp-1 mb-6">
                  {draft.content || "..................................."}
                </div>
              <div className="text-right">
              <Link href={`/blog_write?draftId=${draft.id}`} className="text-indigo-600 text-sm">Continue editing</Link>
              </div>
            </div>
          ))}
        </div> 
    </div>
  </>
        ) : (
              // Edit Profile Form
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  {/* Profile Picture Section */}
                  <div className="relative group">
                    <div
                      className={`w-32 h-32 rounded-full flex items-center justify-center ${
                        imageFile ? "bg-gray-100" : "bg-gray-50 border-2 border-dashed border-gray-300"
                      }`}
                    >
                      {imageFile ? (
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Profile preview"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <input
                      type="file"
                      id="profilePicture"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="profilePicture"
                      className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={async (e) => {
                      const newUsername = e.target.value;
                      setUsername(newUsername);
                      const isAvailable = await checkUsernameAvailability(newUsername);
                      setIsUsernameAvailable(isAvailable);
                    }}
                    className={`block w-full px-4 py-3 bg-gray-50 border ${isUsernameAvailable ? 'border-gray-300' : 'border-red-500'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black`}
                    placeholder="Choose your username"
                  />
                  {!isUsernameAvailable && <p className="text-red-500">Username is taken.</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows="4"
                    className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Save and Cancel Buttons */}
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={handleCancel}
                    className="bg-gray-300 text-gray-700 px-4 py-1 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-indigo-500 text-white px-4 py-1 rounded-md"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
}
