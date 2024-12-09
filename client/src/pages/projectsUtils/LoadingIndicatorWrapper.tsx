import LoadingIndicator from "@/components/ui/loadingIndicator";

const LoadingIndicatorWrapper = ({ isLoading }: { isLoading: boolean }) => {
    return (
        isLoading && (
            <div className="newItemsLoader" onClick={(e) => { e.stopPropagation(); }}>
                <LoadingIndicator />
                <p>Updating</p>
            </div>
        )
    );
};

export default LoadingIndicatorWrapper;
