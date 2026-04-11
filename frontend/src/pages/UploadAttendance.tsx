import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { getAttendanceById, processAttendance, requestAttendanceUploadUrl, uploadAttendanceImage, waitForAttendanceResult } from '../api/client';
import { FileImage, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UploadAttendance() {
  const [classId, setClassId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setResult(null); // clear previous bounding boxes
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !imageFile) {
      setError('Please provide Class ID and select an image.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setAttendanceId(null);
    setProcessingStage('Creating upload session...');

    try {
      const uploadSession = await requestAttendanceUploadUrl(classId);
      setAttendanceId(uploadSession.attendance_id);

      setProcessingStage('Uploading image to cloud storage...');
      await uploadAttendanceImage(uploadSession.upload_url, imageFile);

      setProcessingStage('Google Cloud AI is detecting and matching faces...');
      const response = await waitForAttendanceResult(uploadSession.attendance_id);
      setResult(response);
    } catch (err: any) {
      // Fallback for environments where upload-url endpoint is not deployed yet.
      if (imagePreviewUrl) {
        try {
          setProcessingStage('Fallback mode: processing directly via API...');
          const base64 = imagePreviewUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          const fallbackResponse = await processAttendance(classId, { image: base64 });
          if (fallbackResponse?.attendance_id) {
            setAttendanceId(fallbackResponse.attendance_id);
            const latest = await getAttendanceById(fallbackResponse.attendance_id);
            setResult(latest);
          } else {
            setResult(fallbackResponse);
          }
        } catch (fallbackErr: any) {
          setError(fallbackErr.response?.data?.error || fallbackErr.message);
        }
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
      setProcessingStage(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6 mt-4 px-0 sm:px-0">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <FileImage className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl sm:text-2xl">Upload Class Photo</CardTitle>
            </div>
            <CardDescription className="text-sm sm:text-base">Submit a group photo to automatically mark attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-4 rounded-md text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="classId">Class/Group ID</Label>
                  <Input 
                    id="classId" 
                    placeholder="e.g. CS101" 
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="groupImage">Group Image</Label>
                  <Input 
                    id="groupImage" 
                    type="file" 
                    accept="image/jpeg, image/png"
                    onChange={handleImageChange}
                  />
                </div>
                
                {result && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 border-t border-slate-100">
                    <h4 className="font-semibold flex items-center gap-2 text-emerald-600 mb-4">
                      <CheckCircle2 className="w-5 h-5" />
                      Attendance Processed
                    </h4>
                    <div className="space-y-2 text-sm text-slate-700">
                      {attendanceId && (
                        <div className="flex justify-between bg-slate-50 p-2 rounded">
                          <span>Attendance ID:</span>
                          <span className="font-mono text-xs">{attendanceId}</span>
                        </div>
                      )}
                      <div className="flex justify-between bg-slate-50 p-2 rounded">
                        <span>Faces Matched:</span>
                        <span className="font-bold">{result.present_count || result.recognized?.length || 0}</span>
                      </div>
                      <div className="flex justify-between bg-slate-50 p-2 rounded">
                        <span>Unrecognized Faces:</span>
                        <span className="font-bold">{result.unrecognized_faces?.length || 0}</span>
                      </div>
                      
                      {result.recognized?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="font-medium mb-2">Present Students:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {result.recognized.map((st: any) => (
                              <li key={st.student_id}>{st.name || st.student_id} ({st.student_id})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="border border-slate-200 rounded-lg bg-slate-50 p-2 sm:p-3 flex items-center justify-center relative min-h-[240px] sm:min-h-[300px] overflow-hidden order-first md:order-none">
                {!imagePreviewUrl ? (
                  <p className="text-slate-400 text-sm">Image preview will appear here</p>
                ) : (
                  <div className="relative inline-block max-w-full w-full">
                    <img 
                      ref={imageRef}
                      src={imagePreviewUrl} 
                      alt="Class Preview" 
                      className="max-w-full h-auto object-contain rounded mx-auto"
                    />
                    
                    {/* Render Bounding Boxes */}
                    {result && imageRef.current && (
                      <svg 
                        className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {(result.recognized || []).map((face: any, i: number) => {
                          const box = face.bounding_box;
                          return (
                            <g key={`recognized-${i}`}>
                              <rect 
                                x={`${box.Left * 100}%`} 
                                y={`${box.Top * 100}%`} 
                                width={`${box.Width * 100}%`} 
                                height={`${box.Height * 100}%`} 
                                fill="none" 
                                stroke="#10b981"
                                strokeWidth="3" 
                                rx="4"
                              />
                            </g>
                          );
                        })}
                        {(result.unrecognized_faces || []).map((face: any, i: number) => {
                          const box = face.bounding_box;
                          return (
                            <g key={`unknown-${i}`}>
                              <rect 
                                x={`${box.Left * 100}%`} 
                                y={`${box.Top * 100}%`} 
                                width={`${box.Width * 100}%`} 
                                height={`${box.Height * 100}%`} 
                                fill="none" 
                                stroke="#f43f5e"
                                strokeWidth="3" 
                                rx="4"
                              />
                            </g>
                          );
                        })}
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
            {processingStage && (
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                {processingStage}
              </div>
            )}
            
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-medium h-11 w-full md:w-auto" disabled={loading || !imagePreviewUrl}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Face Data...
                </>
              ) : (
                'Process Attendance'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
