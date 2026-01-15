import React, { useState, useEffect } from 'react';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
  };

  const formatDate = (date) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="flex flex-row items-center justify-center gap-3 px-3 py-2 bg-teal-50 rounded-lg border border-teal-200 shadow-sm">
      <div 
        className="text-teal-700 font-bold leading-none inline-block" 
        style={{ 
          fontFamily: "'DigitalFont', monospace", 
          fontSize: '1.5rem',
          letterSpacing: '0.1em',
          textShadow: '0 0 2px rgba(20, 184, 166, 0.3)',
          fontWeight: '700',
          minWidth: '8.5rem',
          textAlign: 'left'
        }}
      >
        {formatTime(time)}
      </div>
      <div className="text-teal-600 text-xs font-medium">
        {formatDate(time)}
      </div>
    </div>
  );
};

export default DigitalClock;
