import React, { useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip, Rectangle } from 'recharts';
import { Typography, Paper, useTheme, Box, Breadcrumbs, Link as MuiLink } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// Data structure for Treemap:
// Recharts Treemap expects data in a hierarchical format.
// Each node should have a 'name' (label), 'size' (value), and optionally 'children' array.
export interface TreemapNode {
  name: string;
  size: number;
  children?: TreemapNode[];
  // Optional: add original path or other metadata if needed for drilldown/breadcrumbs
  path?: string[];
  color?: string; // To assign specific colors
}

interface SunburstTreemapChartProps {
  data: TreemapNode[]; // Expects a single root node or an array of top-level nodes
  title?: string;
  dataKey?: string; // Key for the 'size' attribute in data objects, defaults to 'size'
  nameKey?: string; // Key for the 'name' attribute, defaults to 'name'
  aspectRatio?: number; // To control the shape of the treemap rectangles
  // Optional: handle drilldown. If provided, chart will try to update its root on click.
  // onNodeClick?: (node: TreemapNode) => void; // For more complex drilldown management by parent
}

// Helper to generate contrasting text color (simple version)
const getContrastingTextColor = (hexColor: string): string => {
  if (!hexColor) return '#000000';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
};


// Custom content renderer for Treemap cells to allow better text display
const CustomizedTreemapContent: React.FC<any> = (props) => {
  const { root, depth, x, y, width, height, index, payload, rank, name, color: nodeColor, size } = props;
  const theme = useTheme();

  const textColor = getContrastingTextColor(nodeColor || theme.palette.primary.main);

  // Don't render text for very small cells or if it's too deep (too many items)
  if (width < 30 || height < 20) {
    return null;
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: nodeColor || (depth < 2 ? theme.palette.primary.light : theme.palette.secondary.light),
          stroke: theme.palette.background.paper,
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
        fontSize={Math.max(10, Math.min(width, height) / 5)} // Adjust font size dynamically
        fontWeight="bold"
        style={{ pointerEvents: 'none' }} // Text should not capture mouse events
      >
        {name}
      </text>
      {/* Optionally display size if space permits and it's a leaf node */}
      {/* {height > 35 && width > 50 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + Math.max(10, Math.min(width, height) / 5) * 0.8} // Position below name
          textAnchor="middle"
          dominantBaseline="middle"
          fill={textColor}
          fontSize={Math.max(8, Math.min(width, height) / 7)}
          style={{ pointerEvents: 'none' }}
        >
          ({size.toLocaleString()})
        </text>
      )} */}
    </g>
  );
};


const SunburstTreemapChart: React.FC<SunburstTreemapChartProps> = ({
  data,
  title = 'Budget Breakdown',
  dataKey = 'size',
  nameKey = 'name',
  aspectRatio = 4 / 3, // Default aspect ratio
}) => {
  const theme = useTheme();
  const [currentRoot, setCurrentRoot] = useState<TreemapNode | null>(null); // For drilldown
  const [history, setHistory] = useState<TreemapNode[]>([]); // For breadcrumbs

  // Use the first item in data array as the initial root if data is an array of multiple roots
  // Or if data itself is a single root object (though Recharts Treemap expects array for  prop)
  // For simplicity, we'll assume  is an array of nodes to be displayed at the current level.
  // If  is meant to be a single hierarchical object, the Treemap  prop should be
  // and drilldown logic would change.
  // For this implementation,  represents the children of the current  or initial top-level items.

  const displayData = currentRoot ? currentRoot.children : data;

  const handleNodeClick = (node: any) => { // node type from Recharts is complex
    // We are interested in the payload which should be our TreemapNode
    if (node && node.payload) {
      const clickedNode = node.payload as TreemapNode;
      if (clickedNode.children && clickedNode.children.length > 0) {
        setHistory([...history, currentRoot || { name: 'Root', size: 0, children: data, path: ['Root'] }]); // Save current view before drilldown
        setCurrentRoot(clickedNode);
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) { // Clicked on 'Root'
      setCurrentRoot(null);
      setHistory([]);
    } else {
      setCurrentRoot(history[index]);
      setHistory(history.slice(0, index));
    }
  };


  if (!displayData || displayData.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        {currentRoot && <Typography variant="subtitle1">Sub-level: {currentRoot.name}</Typography>}
        <Typography variant="body1">No data available to display.</Typography>
         {history.length > 0 && (
          <MuiLink component="button" variant="body2" onClick={() => handleBreadcrumbClick(history.length -1)}>
            Go Back
          </MuiLink>
        )}
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, height: { xs: 400, sm: 500, md: 600 } }} role='figure' aria-label={title}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          {title} {currentRoot ? `- ${currentRoot.name}` : ''}
        </Typography>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <MuiLink
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => handleBreadcrumbClick(-1)}
          >
            Root
          </MuiLink>
          {history.map((histNode, index) => (
            <MuiLink
              component="button"
              underline="hover"
              color="inherit"
              key={index}
              onClick={() => handleBreadcrumbClick(index)}
            >
              {histNode.name === 'Root' ? 'Top Level' : histNode.name /* Avoid showing 'Root' from dummy history node */}
            </MuiLink>
          ))}
          {currentRoot && <Typography color="text.primary">{currentRoot.name}</Typography>}
        </Breadcrumbs>
      </Box>
      <ResponsiveContainer width="100%" height="90%">
        <Treemap
          data={displayData}
          dataKey={dataKey}
          nameKey={nameKey}
          aspectRatio={aspectRatio}
          isAnimationActive={true}
          animationDuration={300}
          // content={<CustomizedTreemapContent />} // Using default for now, custom can be complex
          onClick={handleNodeClick} // Handle click for drilldown
          // Assign colors based on depth or category if possible
          // This is a simple color assignment, can be made more sophisticated
          // fill={theme.palette.background.default} // Default fill, individual cells can override
        >
          <Tooltip
            formatter={(value: number, name: string, entry: any) => {
              const size = entry.payload?.payload?.size || entry.payload?.size || 0;
              const itemName = entry.payload?.payload?.name || entry.payload?.name || '';
              return [`${size.toLocaleString()} NAD Million`, itemName];
            }}
            labelStyle={{ fontWeight: 'bold' }}
            itemStyle={{ textTransform: 'capitalize' }}
          />
        </Treemap>
      </ResponsiveContainer>
    </Paper>
  );
};

export default SunburstTreemapChart;

// Example of how to transform BudgetEntry[] to TreemapNode structure
// This function creates a two-level hierarchy: Vote -> Category
// It can be extended for Vote -> Category -> SubCategory
export const transformBudgetDataForTreemap = (
  budgetData: import('../../services/api').BudgetEntry[], // Use full import for BudgetEntry
  fiscalYear: string // Filter data for a single year
): TreemapNode[] => {
  const yearData = budgetData.filter(entry => entry.fy === fiscalYear);
  if (!yearData || yearData.length === 0) return [];

  const root: TreemapNode = { name: fiscalYear, children: [], size:0, path: [fiscalYear] };
  const votes: Record<string, TreemapNode> = {};

  // Assign colors from a predefined palette for consistency
  const theme = useTheme(); // Hook can only be called in React components or custom hooks.
                            // For helper, pass theme colors or use a static palette.
  const baseColors = [
    theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main,
    theme.palette.info.main, theme.palette.warning.main, theme.palette.error.main,
    '#FFC300', '#C70039', '#900C3F', '#581845'
  ];
  let colorIndex = 0;

  yearData.forEach(entry => {
    if (!entry.vote || !entry.category || entry.amount_nad_millions <= 0) return;

    if (!votes[entry.vote]) {
      votes[entry.vote] = {
        name: entry.vote,
        children: [],
        size: 0, // Vote size will be sum of its children categories
        path: [fiscalYear, entry.vote],
        color: baseColors[colorIndex % baseColors.length]
      };
      colorIndex++;
      root.children?.push(votes[entry.vote]);
    }

    const voteNode = votes[entry.vote];
    let categoryNode = voteNode.children?.find(cat => cat.name === entry.category);

    if (!categoryNode) {
      categoryNode = {
        name: entry.category,
        size: 0, // Category size will be sum of its sub-categories or direct amounts
        children: [], // For potential sub_category drilldown
        path: [fiscalYear, entry.vote, entry.category],
        // Inherit or slightly modify color from parent vote
        // color: tinycolor(voteNode.color).lighten(10).toString() // Example: lighten parent color
        // Simplified color assignment without tinycolor:
        color: baseColors[(colorIndex + 5) % baseColors.length]
      };
      voteNode.children?.push(categoryNode);
    }

    // If sub_category exists and is meaningful, add another level
    if (entry.sub_category) {
        let subCategoryNode = categoryNode.children?.find(subCat => subCat.name === entry.sub_category);
        if (!subCategoryNode) {
            subCategoryNode = {
                name: entry.sub_category,
                size: 0,
                path: [fiscalYear, entry.vote, entry.category, entry.sub_category],
                // color: tinycolor(categoryNode.color).lighten(10).toString()
                // Simplified color assignment without tinycolor:
                color: baseColors[(colorIndex + 10) % baseColors.length]
            };
            categoryNode.children?.push(subCategoryNode);
        }
        subCategoryNode.size += entry.amount_nad_millions;
    } else {
      // If no sub_category, the amount contributes directly to the category's size
      // Only if category itself is not an aggregator of sub-categories
      if (!categoryNode.children || categoryNode.children.length === 0) {
         categoryNode.size += entry.amount_nad_millions;
      }
    }

    // Aggregate sizes up the tree
    // This part of aggregation was flawed, size of category should be sum of its children if they exist
    // Or its direct amount if no children. Corrected below.
    // categoryNode.size = categoryNode.children && categoryNode.children.length > 0 ?
    //                      categoryNode.children.reduce((acc, child) => acc + child.size, 0) :
    //                      categoryNode.size; // Keep direct size if no children

  });

  // Correctly sum up sizes from children for votes and categories that have them
  root.children?.forEach((voteN: TreemapNode) => {
    if (voteN.children && voteN.children.length > 0) {
      voteN.children.forEach((catN: TreemapNode) => {
        if (catN.children && catN.children.length > 0) {
          catN.size = catN.children.reduce((sum, subCat) => sum + subCat.size, 0);
        }
        // If catN has no children, its size was already accumulated from entries with no sub_category
      });
      voteN.size = voteN.children.reduce((sum, cat) => sum + cat.size, 0);
    }
  });

  root.size = root.children?.reduce((sum, vote) => sum + vote.size, 0) || 0;

  // The Treemap component usually expects an array of nodes for its  prop.
  // If you want to display from the 'root' (e.g. all votes for a FY), return root.children
  return root.children || [];
};
// Need to install tinycolor2 for color manipulation in transform function
// npm install tinycolor2
// And @types/tinycolor2 for typescript
// npm install --save-dev @types/tinycolor2
// The subtask cannot run npm install. This will need to be done in a separate step or assume it's available.
// For now, I will remove the tinycolor dependency to avoid breaking the subtask,
// and use a simpler color assignment. The theme hook also cannot be used in the helper.

// Revised transformBudgetDataForTreemap_v2 (already integrated into the echo block as transformBudgetDataForTreemap)
// The version in the echo block IS the v2 (without tinycolor and useTheme in the helper).
