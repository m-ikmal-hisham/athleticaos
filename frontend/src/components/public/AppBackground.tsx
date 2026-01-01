export const AppBackground = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            {/* Base Overlay Gradient - Enhances the underlying image */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-red-50/30 dark:from-blue-900/10 dark:via-transparent dark:to-red-900/10" />

            {/* Abstract Waves (SVG) */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] opacity-[0.03] dark:opacity-[0.05] transform translate-x-1/3 -translate-y-1/3">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.4,82.2,23.1,70.9,34.8C59.6,46.5,48.3,56.2,35.8,63.9C23.3,71.6,9.6,77.3,-2.6,81.8C-14.8,86.3,-25.5,89.6,-35.1,86.3C-44.7,83,-53.2,73.1,-62.4,62.8C-71.6,52.5,-81.5,41.8,-86.3,29.3C-91.1,16.8,-90.8,2.5,-85.7,-9.8C-80.6,-22.1,-70.7,-32.4,-60.6,-41.8C-50.5,-51.2,-40.2,-59.7,-29.1,-68.2C-18,-76.7,-6.1,-85.2,5,-93.8L16.1,-102.4L44.7,-76.4Z" transform="translate(100 100)" />
                </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] opacity-[0.03] dark:opacity-[0.05] transform -translate-x-1/3 translate-y-1/3 rotate-180">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M41.5,-71.3C52.7,-65.4,60.3,-53,67.6,-41.3C74.9,-29.6,81.9,-18.6,83.4,-7C84.9,4.6,80.9,16.8,74.2,27.3C67.5,37.8,58.1,46.6,48.2,54.8C38.3,63,27.9,70.6,16.4,74.3C4.9,78,-7.7,77.8,-19.1,73.9C-30.5,70,-40.7,62.4,-50.7,53.6C-60.7,44.8,-70.5,34.8,-76.3,22.7C-82.1,10.6,-83.9,-3.6,-79.8,-16.9C-75.7,-30.2,-65.7,-42.6,-53.8,-48.3C-41.9,-54,-28.1,-53,-15.5,-55.1C-2.9,-57.2,8.5,-62.4,20.6,-71.3" transform="translate(100 100)" />
                </svg>
            </div>
        </div>
    );
};
