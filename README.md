# Hum-Raah — NGO Coordination & Civic Reporting Platform

A cross-platform civic coordination system enabling NGOs to respond to civic issues and allowing citizens to report problems with location awareness and real-time updates. Built with Flutter (mobile/web) and Node.js backend with MongoDB and real-time Socket.io communication.

## 📍 Project Status

**Backend**: ✅ Deployed on Railway (https://humraah-backend.railway.app)  
**Frontend**: ✅ Flutter cross-platform app (iOS, Android, Web)  
**Mobile Apps**: ✅ Ready (iOS/Android native performance)  
**Web Version**: ✅ Flutter web (deployable)  
**Database**: ✅ MongoDB Atlas  
**Real-time**: ✅ Socket.io active

## 📂 Repository

https://github.com/LaibaaJamil/humraah-backend-public

## ✨ Key Features

### Citizen Reporting
- Location-based issue reporting with GPS
- GIS integration for map-based visibility
- Issue categories and severity levels
- Photo and document attachments
- Report status tracking
- Real-time notifications

### NGO Coordination
- Role-based access (admin, coordinator, field staff)
- Dashboard with active issues
- Issue assignment to teams
- Field staff real-time location
- Report verification pipeline
- Performance metrics

### Real-time Communication
- Socket.io for live updates
- Real-time status changes
- Team notifications
- Live location tracking
- Message updates without page refresh

### Cross-Platform
- Flutter mobile app (iOS & Android native)
- Web interface for coordinators
- Responsive design
- Native performance
- Offline support ready

### GIS Features
- Map-based issue visualization
- Location clustering
- Heat maps of issue density
- Route optimization
- Boundary-based filtering

## 🛠️ Tech Stack

### Frontend
- **Framework**: Flutter (Dart)
- **Platforms**: iOS, Android, Web
- **State Management**: Provider pattern
- **Maps**: Google Maps integration
- **Real-time**: Socket.io client
- **Local Storage**: SQLite

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **API**: RESTful + WebSocket (Socket.io)
- **Authentication**: JWT tokens
- **Password Security**: bcryptjs
- **Deployment**: Railway

### Database
- **Platform**: MongoDB Atlas
- **ODM**: Mongoose
- **Collections**: users, issues, assignments, updates, locations
- **Indexing**: Geo-spatial indexes for location queries

### Real-time
- **Socket.io**: Live updates and notifications
- **Events**: status-updates, new-assignments, location-changes
- **Rooms**: Namespace per issue for group communication

## 📊 Database Collections

### Users
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  name: String,
  role: String (citizen, coordinator, admin),
  phone: String,
  organization: String,
  location: { type: Point, coordinates: [lng, lat] },
  createdAt: Date
}
```

### Issues
```javascript
{
  _id: ObjectId,
  reporterId: ObjectId (ref: User),
  title: String,
  description: String,
  category: String,
  severity: String (low, medium, high),
  location: { type: Point, coordinates: [lng, lat] },
  address: String,
  attachments: [URL],
  status: String (reported, assigned, in-progress, resolved),
  createdAt: Date,
  updatedAt: Date
}
```

### Assignments
```javascript
{
  _id: ObjectId,
  issueId: ObjectId (ref: Issue),
  coordinatorId: ObjectId (ref: User),
  assignedTeams: [ObjectId],
  status: String,
  assignedAt: Date,
  completedAt: Date
}
```

### Location Updates (Real-time)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  location: { type: Point, coordinates: [lng, lat] },
  timestamp: Date,
  accuracy: Number
}
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login and get JWT
- `POST /api/auth/logout` - Logout

### Issues (Citizens)
- `GET /api/issues` - Get all issues (map view)
- `POST /api/issues` - Report new issue
- `GET /api/issues/:id` - Get issue details
- `GET /api/issues/user/my-reports` - My reported issues
- `PUT /api/issues/:id` - Update issue details

### Coordination (NGO Staff)
- `GET /api/issues/dashboard` - Coordinator dashboard
- `POST /api/issues/:id/assign` - Assign issue to team
- `PUT /api/issues/:id/status` - Update issue status
- `GET /api/teams` - Get team list
- `GET /api/assignments` - Get assignments

### Real-time Events (Socket.io)
- `issue-reported` - New issue reported
- `issue-assigned` - Issue assigned to team
- `status-update` - Issue status changed
- `location-update` - Field staff location update
- `verification-update` - Issue verification status

## 📱 Flutter App Features

### Citizen UI
- Map view of all issues
- Report new issue form
- Issue status tracking
- Photo capture and upload
- Real-time notifications

### Coordinator UI
- Dashboard with active issues
- Issue assignment interface
- Team management
- Field staff tracking
- Report verification

### Native Features
- GPS location access
- Camera and photo library
- Push notifications
- Offline mode (cached data)
- Background location tracking

## 🚀 Deployment

### Backend
```bash
# Deployed on Railway
# URL: https://humraah-backend.railway.app
# Environment variables:
MONGODB_URI=<atlas-connection-string>
JWT_SECRET=<secret-key>
SOCKET_IO_ORIGIN=<frontend-url>
```

### Frontend - Cross-Platform Builds

**Mobile Apps (Native)**
```bash
# Android APK
flutter build apk
# Output: build/app/outputs/apk/release/app-release.apk

# iOS App
flutter build ios
```

**Web Version (Deployable)**
```bash
# Build for web
flutter build web

# Deploy to Vercel
# Deploy to Firebase
# Deploy to Railway
# Any static hosting platform
```

### Live Deployment URLs
- **Backend API**: https://humraah-backend.railway.app ✅
- **Web App**: [Deploy Flutter web to Vercel/Firebase]
- **Mobile**: Download APK or build from source

## 🎯 Use Cases

### Citizen Scenario
1. Citizen notices pothole on road
2. Opens app and reports issue
3. Uploads photo with GPS location
4. Receives real-time status updates
5. Sees when team arrives

### NGO Coordinator Scenario
1. Views dashboard of new reports
2. Sees issue location on map
3. Assigns to field team
4. Monitors team progress in real-time
5. Marks issue as resolved

### Field Staff Scenario
1. Receives assignment notification
2. Navigates to issue location
3. Captures verification photos
4. Updates status in real-time
5. Marks task as complete

## 🔐 Security

- JWT token authentication
- Password hashing with bcryptjs
- Protected endpoints with middleware
- Role-based access control
- HTTPS only on deployment
- Environment variable secrets
- Input validation and sanitization

## 🌍 GIS & Mapping

### Features
- Google Maps integration
- Real-time location updates
- Issue heat maps
- Service area boundaries
- Route optimization
- Spatial queries (radius search)

### Geo Queries
```javascript
// Find issues within radius
db.issues.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 5000 // 5km
    }
  }
})
```

## 🎯 Learning Outcomes

✓ Cross-platform mobile development with Flutter  
✓ Real-time communication with Socket.io  
✓ GIS and location-based services  
✓ Role-based access control design  
✓ Production backend deployment  
✓ MongoDB geospatial queries  
✓ Native mobile features (GPS, camera)  
✓ Real-time notification systems  
✓ Multi-platform architecture  

## 📈 Future Enhancements

- [ ] Advanced analytics dashboard
- [ ] Machine learning for issue prediction
- [ ] SMS notifications for low-connectivity areas
- [ ] Offline report submission
- [ ] Blockchain for transparent tracking
- [ ] Mobile payment integration
- [ ] Video call integration
- [ ] AI-powered issue categorization
- [ ] Multi-language support
- [ ] Sustainability metrics

## 🤝 Contributing

Portfolio project - feedback welcome!

## 📄 License

Educational and portfolio purposes.

## 👤 Author

**Laiba Jamil**
- GitHub: [@LaibaaJamil](https://github.com/LaibaaJamil)
- LinkedIn: [laibajamil312](https://www.linkedin.com/in/laibajamil312)
- Portfolio: [laibaajamil.github.io/laiba-portfolio](https://laibaajamil.github.io/laiba-portfolio)
- Email: laibajamil.312@gmail.com

## 🙏 Acknowledgments

- Final Year Project (2025-2026)
- Supervised by: [Mr Ahsan Zubair]
- Deployed on Railway
- Open-source: Flutter, Node.js, MongoDB

---

**Backend Deployment**: https://humraah-backend.railway.app  
**Repository**: https://github.com/LaibaaJamil/humraah-backend-public  
**Status**: Production-ready ✅
