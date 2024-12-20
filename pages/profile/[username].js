"use client";

import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { db, auth } from '../../firebase/firebase';
import Router from 'next/router';
import { followUser, unfollowUser, isLoggedIn } from '../../firebase/firebaseutils'; // Assuming unfollowUser is the function in utils

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [userBlogs, setUserBlogs] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(null); // `null` to indicate loading
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false); // To show confirmation box

  const router = useRouter();
  const { username: usernameParam } = router.query;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        try {
          const target = usernameParam || null;

          // If a username is provided
          if (target) {
            const userQuery = query(
              collection(db, 'users'),
              where('username', '==', target)
            );
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              const userData = userDoc.data();

              if (userData.uid) {
                setUser(userData);
                setName(userData.name);
                setBio(userData.bio || '');
                setUsername(userData.username);
                setProfileImage(userData.profileImage || '');

                // Fetching user's blogs
                const blogsQuery = query(
                  collection(db, 'blogs'),
                  where('userId', '==', userData.uid)
                );
                const blogsSnapshot = await getDocs(blogsQuery);

                if (!blogsSnapshot.empty) {
                  const blogsData = blogsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  }));
                  setUserBlogs(blogsData);
                } else {
                  setUserBlogs([]);
                }

                // Fetching followers and following count
                setFollowersCount(userData.followersCount || 0);
                setFollowingCount(userData.followingCount || 0);

                // Check if current user is following this user
                if(currentUser){
                  const followDocRef = doc(db, 'follows', `${currentUser.uid}_${userData.uid}`);
                  const followDocSnap = await getDoc(followDocRef);
                  setIsFollowing(followDocSnap.exists());
                }else{
                  setIsFollowing(false);
                }
              } else {
                setError("User data is missing UID.");
              }
            } else {
              setError("User not found.");
            }
          } else {
            setError("No username parameter provided.");
          }
        } catch (err) {
          setError(`Error: ${err.message}`);
        }
      
    });

    return () => unsubscribe();
  }, [usernameParam]);

  // Function to handle follow/unfollow
  const handleFollow = async () => {
    console.log(isLoggedIn());
    if(isLoggedIn()){
    if (isFollowing) {
      setShowUnfollowConfirm(true); // Show confirmation box for unfollow
    } else {
      try {
        // Call the follow function from utils
        await followUser(user.uid, username, auth.currentUser.uid, followersCount, followingCount);

        // Update local state after following
        setIsFollowing(true); // Now user is following
        setFollowersCount(followersCount + 1); // Increment followers count
        setFollowingCount(followingCount + 1); // Increment following count
      } catch (err) {
        setError(`Error following user: ${err.message}`);
      }
    }}else{
      Router.push('/login');
    }
  };

  // Function to confirm unfollow action
  const handleUnfollow = async () => {
    try {
      // Call the unfollow function from utils
      await unfollowUser(user.uid, username, auth.currentUser.uid, followersCount, followingCount);

      // Update local state after unfollowing
      setIsFollowing(false); // Now user is not following
      setFollowersCount(followersCount - 1); // Decrement followers count
      setFollowingCount(followingCount - 1); // Decrement following count
      setShowUnfollowConfirm(false); // Close the confirmation box
    } catch (err) {
      setError(`Error unfollowing user: ${err.message}`);
    }
  };

  // Function to cancel unfollow
  const cancelUnfollow = () => {
    setShowUnfollowConfirm(false); // Close the confirmation box
  };

  // Function to view followers
  const viewFollowers = () => {
    // You can implement the logic to show followers list or navigate to another page
    console.log('View followers');
  };

  // Function to view following
  const viewFollowing = () => {
    // You can implement the logic to show following list or navigate to another page
    console.log('View following');
  };

  return (
    <div className="min-h-screen bg-blue-200 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        {user ? (
  <div className="mb-6">
    {/* Profile and Stats Section */}
    <div className="flex justify-between items-center mb-6">
      <span className="text-xl text-gray-700 font-normal">@{username}</span>
      <div className="flex items-center space-x-3">
        {/* Show the button only after determining the follow status */}
        {isFollowing !== null && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleFollow}
              className="py-2 px-4 bg-blue-600 text-white rounded"
              disabled={isFollowing === null} // Disabled while loading
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          </div>
        )}

        {showUnfollowConfirm && (
          <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-md">
            <p className="text-gray-800">Are you sure you want to unfollow?</p>
            <div className="flex mt-2 justify-center">
              <button
                onClick={handleUnfollow}
                className="py-2 px-4 bg-red-600 text-white rounded mr-2"
              >
                Yes
              </button>
              <button
                onClick={cancelUnfollow}
                className="py-2 px-4 bg-gray-300 text-black rounded"
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Profile Picture, Name, Bio, and Stats Section */}
    <div className="flex items-start mb-8">
      <div className="flex-shrink-0">
        {profileImage ? (
          <img
            src={profileImage}
            alt="Profile"
            className="w-24 h-24 rounded-full border border-gray-200"
          />
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
            <div className="text-indigo-500 font-semibold text-lg">
              {userBlogs.length}
            </div>
            <div className="text-gray-600 text-sm">Blogs</div>
          </div>
          <div>
            <div className="text-indigo-500 font-semibold text-lg">
              {followingCount}
            </div>
            <div className="text-gray-600 text-sm">Following</div>
          </div>
          <div>
            <div className="text-indigo-500 font-semibold text-lg">
              {followersCount}
            </div>
            <div className="text-gray-600 text-sm">Followers</div>
          </div>
        </div>
      </div>
    </div>

    {/* Blogs Section */}
    <div className="w-full">
      <h2 className="text-xl font-medium text-gray-700 mb-6">Blogs</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {userBlogs.map((blog) => (
          <div key={blog.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">{blog.title}</h3>
            <div className="text-gray-500 text-sm line-clamp-1 mb-6">
              {blog.content || "..................................."}
            </div>
            <div className="text-right">
              <a href={`/blog/${blog.id}`} className="text-indigo-600 text-sm">
                Read more
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
) : (
  <div className="text-center text-gray-600">Loading profile...</div>
)}

      </div>
    </div>
  );
  
}
