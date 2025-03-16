'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Container, 
  Title, 
  Text, 
  Card, 
  SimpleGrid, 
  Badge, 
  Group, 
  Button,
  useMantineTheme
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const theme = useMantineTheme();

  useEffect(() => {
    async function getUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch notes data
        const { data, error } = await supabase
          .from('notes') // Replace with your actual table name
          .select('*')
          .order('created_at', { ascending: false });
        
        if (data) {
          setNotes(data);
        }
        
        setLoading(false);
      }
    }
    getUserProfile();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = confirm('Are you sure you want to delete this item?');
    
    if (confirmed) {
      const { error } = await supabase
        .from('notes') // Replace with your actual table name
        .delete()
        .eq('id', id);
      
      if (!error) {
        setNotes(notes.filter(note => note.id !== id));
      }
    }
  };

  if (!user) return (
    <Container size="md" p="md">
      <Text size="lg" ta="center" mt="xl">You need to sign in...</Text>
    </Container>
  );

  if (loading) return (
    <Container size="md" p="md">
      <Text size="lg" ta="center" mt="xl">Loading...</Text>
    </Container>
  );

  return (
    <Container size="xl" p="md">
      <Group justify="space-between" mb="lg">
        <Title order={1}>Welcome, {user.email}!</Title>
        <Button 
          component={Link} 
          href="/notes/new" 
          leftSection={<IconPlus size={16} />}
        >
          Add New
        </Button>
      </Group>
      
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {notes.length > 0 ? (
          notes.map((note) => (
            <Card key={note.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                  <Text fw={500} truncate>
                    {note.title || 'Untitled Note'}
                  </Text>
                  <Badge color={note.status === 'completed' ? 'green' : 'blue'}>
                    {note.status || 'Draft'}
                  </Badge>
                </Group>
              </Card.Section>

              <Text size="sm" c="dimmed" mt="md" lineClamp={3}>
                {note.content || 'No content'}
              </Text>

              <Text size="xs" c="dimmed" mt="md">
                {new Date(note.created_at).toLocaleDateString()}
              </Text>

              <Group mt="md" justify="flex-end">
                <Button 
                  component={Link} 
                  href={`/notes/${note.id}/edit`} 
                  variant="light" 
                  size="xs"
                  leftSection={<IconEdit size={14} />}
                >
                  Edit
                </Button>
                <Button 
                  onClick={() => handleDelete(note.id)} 
                  color="red" 
                  variant="light" 
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                >
                  Delete
                </Button>
              </Group>
            </Card>
          ))
        ) : (
          <Text c="dimmed" ta="center" style={{ gridColumn: '1 / -1' }}>
            No notes found. Click "Add New" to create one.
          </Text>
        )}
      </SimpleGrid>
    </Container>
  );
}